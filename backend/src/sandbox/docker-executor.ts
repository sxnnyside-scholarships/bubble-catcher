import type { ExecutionResult, SupportedDialect } from '@shared/types';
import Docker from 'dockerode';
import { config } from '../config';
import type { SandboxExecutor } from './executor.interface';
import { buildSingleFileTar } from './tar';

/**
 * Resolve Docker connection.
 * Supports:
 * - TCP / HTTP proxy URLs (e.g. tcp://docker-proxy:2375 or http://docker-proxy:2375)
 * - UNIX domain sockets from DOCKER_HOST (e.g. unix:///var/run/docker.sock)
 * - Standard macOS & Linux fallback socket locations
 */
export function createDockerClient(): Docker {
  const fromEnv = process.env['DOCKER_HOST'];
  if (fromEnv) {
    if (fromEnv.startsWith('tcp://') || fromEnv.startsWith('http://')) {
      const parsed = new URL(fromEnv.replace('tcp://', 'http://'));
      return new Docker({
        host: parsed.hostname,
        port: Number(parsed.port) || 2375,
      });
    }
    return new Docker({ socketPath: fromEnv.replace('unix://', '') });
  }

  const candidates = [`${process.env['HOME']}/.docker/run/docker.sock`, '/var/run/docker.sock'];
  return new Docker({ socketPath: candidates[0] });
}

export const docker = createDockerClient();

/** Cache Docker availability to avoid checking every request */
let dockerAvailable: boolean | null = null;
let dockerCheckTime = 0;
const DOCKER_CHECK_TTL_MS = 30_000; // re-check every 30s

export async function checkDockerAvailable(): Promise<boolean> {
  const now = Date.now();
  if (dockerAvailable !== null && now - dockerCheckTime < DOCKER_CHECK_TTL_MS) {
    return dockerAvailable;
  }
  try {
    await docker.ping();
    dockerAvailable = true;
  } catch {
    dockerAvailable = false;
  }
  dockerCheckTime = now;
  return dockerAvailable;
}

async function checkImageExists(imageName: string): Promise<boolean> {
  try {
    await docker.getImage(imageName).inspect();
    return true;
  } catch {
    return false;
  }
}

/* ───────────────────────── Dialect configuration ───────────────────────── */

interface ParsedOutput {
  columns: string[];
  rows: unknown[][];
}

interface DialectConfig {
  image: string;
  /** Environment variables passed to the container */
  env: string[];
  /** Whether this dialect requires a running database server */
  serverBased: boolean;
  /**
   * argv to run the query. Server-based dialects pass SQL as a single argv
   * element to container.exec(), never through a shell. Non-server dialects
   * ignore the `sql` param — the query is written into the container as
   * `/tmp/query.sql` before start (see executeNonServer), never interpolated.
   * `database` selects the project's own database inside the shared server
   * container (see lib/project-db.ts) — non-server dialects ignore it too.
   */
  buildCommand: (sql: string, database: string) => string[];
  /** Server-based only: idempotent "create this project's database if it doesn't exist yet" command,
   * run once per query before `buildCommand`'s query (cheap — a single conditional statement). */
  ensureDatabaseCommand?: (database: string) => string[];
  /** Server-based only: command to drop the project's database on project deletion */
  dropDatabaseCommand?: (database: string) => string[];
  /** Server-based only: named Docker volume mount for persistent data across restarts */
  dataVolume?: {
    volumeName: string;
    containerPath: string;
  };
  /** Healthcheck command (server-based only) */
  healthCheck: string[];
  /** Max seconds to wait for DB readiness */
  readinessTimeoutSec: number;
  /** Interval between readiness polls (ms) */
  readinessPollMs: number;
  /** Whether rootfs can be read-only */
  readonlyRootfs: boolean;
  /** Additional tmpfs mounts required by the engine */
  tmpfs?: Record<string, string>;
  /** Parse raw CLI output into structured columns + rows */
  parseOutput: (stdout: string) => ParsedOutput;
}

const DIALECT_CONFIGS: Record<SupportedDialect, DialectConfig> = {
  /* ── SQLite ─────────────────────────────────────────────────────────── */
  sqlite: {
    image: 'bubble-catcher-sqlite',
    env: [],
    serverBased: false,
    // :memory: avoids filesystem permission issues. Reads the query from
    // /tmp/query.sql (written via putArchive before start), not stdin or
    // shell interpolation — see executeNonServer. The image's ENTRYPOINT is
    // already `["sh","-c"]`, so Cmd is the single script string, not another `sh -c` pair.
    buildCommand: () => ["cat /tmp/seed.sql /tmp/query.sql | sqlite3 -header -separator '\t' :memory:"],
    healthCheck: [],
    readinessTimeoutSec: 0,
    readinessPollMs: 0,
    readonlyRootfs: false, // sqlite3 CLI needs writable /tmp for its rc file
    parseOutput: parseTsvOutput,
  },

  /* ── libSQL ─────────────────────────────────────────────────────────── */
  libsql: {
    image: 'bubble-catcher-libsql',
    env: [],
    serverBased: false,
    // The image's ENTRYPOINT (docker/libsql/run.ts) reads seed + /tmp/query.sql itself; no Cmd needed.
    buildCommand: () => [],
    healthCheck: [],
    readinessTimeoutSec: 0,
    readinessPollMs: 0,
    readonlyRootfs: false,
    parseOutput: parseTsvOutput,
  },

  /* ── PostgreSQL ─────────────────────────────────────────────────────── */
  postgresql: {
    image: 'bubble-catcher-postgres',
    env: ['POSTGRES_PASSWORD=sandbox', 'POSTGRES_DB=sandbox'],
    serverBased: true,
    buildCommand: (sql, database) => [
      'psql',
      '-h',
      '127.0.0.1',
      '-U',
      'postgres',
      '-d',
      database,
      '-c',
      sql,
      '--no-align',
      '-P',
      'tuples_only=off',
      '-P',
      'fieldsep=\t',
      '-P',
      'footer=off',
    ],
    /* Postgres has no `CREATE DATABASE IF NOT EXISTS` — this runs unconditionally and
     * executeInContainer() treats the resulting "already exists" error as success (see
     * ALREADY_EXISTS_PATTERNS), which is simpler and more portable than psql's `\gexec` meta-command
     * (that requires being read as a script, not a single `-c` argument — verified the hard way). */
    ensureDatabaseCommand: (database) => [
      'psql',
      '-h',
      '127.0.0.1',
      '-U',
      'postgres',
      '-d',
      'postgres',
      '-c',
      `CREATE DATABASE "${database}"`,
    ],
    dropDatabaseCommand: (database) => [
      'psql',
      '-h',
      '127.0.0.1',
      '-U',
      'postgres',
      '-d',
      'postgres',
      '-c',
      `DROP DATABASE IF EXISTS "${database}" WITH (FORCE)`,
    ],
    dataVolume: {
      volumeName: 'bubble-catcher-data-postgresql',
      containerPath: '/var/lib/postgresql/data',
    },
    healthCheck: ['pg_isready', '-h', '127.0.0.1', '-U', 'postgres'],
    readinessTimeoutSec: 30,
    readinessPollMs: 500,
    readonlyRootfs: false,
    tmpfs: { '/run/postgresql': 'rw,noexec,nosuid,size=16m' },
    parseOutput: parseTsvOutput,
  },

  /* ── MySQL ──────────────────────────────────────────────────────────── */
  mysql: {
    image: 'bubble-catcher-mysql',
    env: ['MYSQL_ROOT_PASSWORD=sandbox', 'MYSQL_DATABASE=sandbox'],
    serverBased: true,
    buildCommand: (sql, database) => [
      'mysql',
      '-h',
      '127.0.0.1',
      '-u',
      'root',
      '-psandbox',
      database,
      '-e',
      sql,
      '--batch',
      '--raw',
    ],
    ensureDatabaseCommand: (database) => [
      'mysql',
      '-h',
      '127.0.0.1',
      '-u',
      'root',
      '-psandbox',
      '-e',
      `CREATE DATABASE IF NOT EXISTS \`${database}\``,
    ],
    dropDatabaseCommand: (database) => [
      'mysql',
      '-h',
      '127.0.0.1',
      '-u',
      'root',
      '-psandbox',
      '-e',
      `DROP DATABASE IF EXISTS \`${database}\``,
    ],
    dataVolume: {
      volumeName: 'bubble-catcher-data-mysql',
      containerPath: '/var/lib/mysql',
    },
    healthCheck: ['mysqladmin', 'ping', '-h', '127.0.0.1', '-u', 'root', '-psandbox', '--silent'],
    readinessTimeoutSec: 60,
    readinessPollMs: 1000,
    readonlyRootfs: false,
    parseOutput: parseTsvOutput,
  },

  /* ── MariaDB ────────────────────────────────────────────────────────── */
  mariadb: {
    image: 'bubble-catcher-mariadb',
    env: ['MYSQL_ROOT_PASSWORD=sandbox', 'MYSQL_DATABASE=sandbox'],
    serverBased: true,
    buildCommand: (sql, database) => [
      'mariadb',
      '-h',
      '127.0.0.1',
      '-u',
      'root',
      '-psandbox',
      database,
      '-e',
      sql,
      '--batch',
      '--raw',
    ],
    ensureDatabaseCommand: (database) => [
      'mariadb',
      '-h',
      '127.0.0.1',
      '-u',
      'root',
      '-psandbox',
      '-e',
      `CREATE DATABASE IF NOT EXISTS \`${database}\``,
    ],
    dropDatabaseCommand: (database) => [
      'mariadb',
      '-h',
      '127.0.0.1',
      '-u',
      'root',
      '-psandbox',
      '-e',
      `DROP DATABASE IF EXISTS \`${database}\``,
    ],
    dataVolume: {
      volumeName: 'bubble-catcher-data-mariadb',
      containerPath: '/var/lib/mysql',
    },
    healthCheck: ['mariadb-admin', 'ping', '-h', '127.0.0.1', '-u', 'root', '-psandbox', '--silent'],
    readinessTimeoutSec: 60,
    readinessPollMs: 1000,
    readonlyRootfs: false,
    parseOutput: parseTsvOutput,
  },

  /* ── MSSQL ──────────────────────────────────────────────────────────── */
  mssql: {
    image: 'bubble-catcher-mssql',
    env: ['ACCEPT_EULA=Y', 'SA_PASSWORD=Sandbox123!', 'MSSQL_PID=Developer'],
    serverBased: true,
    buildCommand: (sql, database) => [
      '/opt/mssql-tools18/bin/sqlcmd',
      '-S',
      '127.0.0.1',
      '-U',
      'sa',
      '-P',
      'Sandbox123!',
      '-d',
      database,
      '-Q',
      sql,
      '-s',
      '\t',
      '-W',
      '-C',
    ],
    ensureDatabaseCommand: (database) => [
      '/opt/mssql-tools18/bin/sqlcmd',
      '-S',
      '127.0.0.1',
      '-U',
      'sa',
      '-P',
      'Sandbox123!',
      '-Q',
      `IF NOT EXISTS (SELECT * FROM sys.databases WHERE name = '${database}') CREATE DATABASE [${database}]`,
      '-C',
    ],
    dropDatabaseCommand: (database) => [
      '/opt/mssql-tools18/bin/sqlcmd',
      '-S',
      '127.0.0.1',
      '-U',
      'sa',
      '-P',
      'Sandbox123!',
      '-Q',
      `IF EXISTS (SELECT * FROM sys.databases WHERE name = '${database}') BEGIN ALTER DATABASE [${database}] SET SINGLE_USER WITH ROLLBACK IMMEDIATE; DROP DATABASE [${database}]; END`,
      '-C',
    ],
    dataVolume: {
      volumeName: 'bubble-catcher-data-mssql',
      containerPath: '/var/opt/mssql/data',
    },
    healthCheck: [
      '/opt/mssql-tools18/bin/sqlcmd',
      '-S',
      '127.0.0.1',
      '-U',
      'sa',
      '-P',
      'Sandbox123!',
      '-Q',
      'SELECT 1',
      '-C',
    ],
    readinessTimeoutSec: 45,
    readinessPollMs: 2000,
    readonlyRootfs: false,
    parseOutput: parseMssqlOutput,
  },
};

/* ───────────────────────── Output parsers ───────────────────────────── */

function parseTsvOutput(stdout: string): ParsedOutput {
  const lines = stdout.trim().split('\n').filter(Boolean);
  if (lines.length === 0) return { columns: [], rows: [] };

  const headers = lines[0].split('\t').map((h) => h.trim());
  const columns = headers;
  const rows: unknown[][] = lines.slice(1).map((line) => {
    const values = line.split('\t');
    return headers.map((_, i) => values[i]?.trim() ?? null);
  });

  return { columns, rows };
}

function parseMssqlOutput(stdout: string): ParsedOutput {
  const lines = stdout.trim().split('\n').filter(Boolean);
  if (lines.length < 2) return { columns: [], rows: [] };

  /* MSSQL output: header row, separator row (---), then data rows, then (N rows affected) */
  const headers = lines[0].split('\t').map((h) => h.trim());
  const columns = headers;

  const dataLines = lines.slice(2).filter((line) => !line.match(/^\(\d+ rows? affected\)$/));
  const rows: unknown[][] = dataLines.map((line) => {
    const values = line.split('\t');
    return headers.map((_, i) => values[i]?.trim() ?? null);
  });

  return { columns, rows };
}

/* ───────────────────────── Executor ─────────────────────────────────── */

/**
 * Non-server dialects (SQLite, libSQL): query written as `/tmp/query.sql` before start, container runs, output collected, removed.
 * Server-based dialects: container starts with the image's default entrypoint, polls readiness, then runs the query via `container.exec()`.
 */
export class DockerSandboxExecutor implements SandboxExecutor {
  readonly dialect: SupportedDialect;
  readonly imageName: string;
  private readonly config: DialectConfig;

  constructor(dialect: SupportedDialect) {
    this.dialect = dialect;
    this.config = DIALECT_CONFIGS[dialect];
    this.imageName = `${this.config.image}:${config.sandboxImageTag}`;
  }

  async execute(sql: string, timeoutMs: number, memoryLimit: string, seedSql?: string): Promise<ExecutionResult> {
    const startTime = Date.now();

    /* ── Pre-flight: Docker daemon reachable? ──────────────────── */
    const dockerOk = await checkDockerAvailable();
    if (!dockerOk) {
      return {
        success: false,
        status: 'error',
        executionTimeMs: Date.now() - startTime,
        error: {
          message: `[${this.dialect}] Docker is not running. Start Docker Desktop and try again.`,
          code: 'DOCKER_UNAVAILABLE',
        },
        executedAt: new Date().toISOString(),
      };
    }

    /* ── Pre-flight: image exists? ─────────────────────────────── */
    const imageOk = await checkImageExists(this.imageName);
    if (!imageOk) {
      return {
        success: false,
        status: 'error',
        executionTimeMs: Date.now() - startTime,
        error: {
          message: `[${this.dialect}] Docker image '${this.imageName}' not found. Run: cd docker && ./build-images.sh (or set SANDBOX_IMAGE_TAG to match a tag you've built).`,
          code: 'IMAGE_NOT_FOUND',
        },
        executedAt: new Date().toISOString(),
      };
    }

    try {
      if (this.config.serverBased) {
        /* Server-based dialects (postgres/mysql/mariadb/mssql) no longer spin up a fresh container per
         * query — they run against the admin-started, long-lived container via executeInContainer().
         * Reaching here means a caller forgot to route through sandbox/lifecycle.service.ts. */
        return {
          success: false,
          status: 'error',
          executionTimeMs: Date.now() - startTime,
          error: {
            message: `[${this.dialect}] This engine requires a running admin-managed container — use executeInContainer, not execute().`,
            code: 'INTERNAL_ERROR',
          },
          executedAt: new Date().toISOString(),
        };
      }
      return await this.executeNonServer(sql, timeoutMs, memoryLimit, startTime, seedSql);
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      /* Classify the error */
      const isDockerError =
        message.includes('connect ENOENT') ||
        message.includes('connect ECONNREFUSED') ||
        message.includes('socket hang up') ||
        message.includes('Was there a typo');

      const code = isDockerError ? 'DOCKER_UNAVAILABLE' : 'SANDBOX_ERROR';
      const userMessage = isDockerError
        ? `[${this.dialect}] Docker is not running. Start Docker Desktop and try again.`
        : `[${this.dialect}] Sandbox execution failed: ${message}`;

      /* Invalidate Docker check cache on connection errors */
      if (isDockerError) dockerAvailable = null;

      console.error(`[DockerSandboxExecutor] ${this.dialect} execution failed:`, message);

      return {
        success: false,
        status: 'error',
        executionTimeMs: Date.now() - startTime,
        error: { message: userMessage, code },
        executedAt: new Date().toISOString(),
      };
    }
  }

  /* ── Non-server execution (SQLite, libSQL) ──────────────────────── */

  private async executeNonServer(
    sql: string,
    timeoutMs: number,
    memoryLimit: string,
    startTime: number,
    seedSql?: string,
  ): Promise<ExecutionResult> {
    let container: Docker.Container | null = null;
    try {
      container = await docker.createContainer({
        Image: this.imageName,
        Env: this.config.env,
        Cmd: this.config.buildCommand(sql, ''),
        Labels: {
          'bubble-catcher.managed': 'true',
          'bubble-catcher.role': 'ephemeral-query',
          'bubble-catcher.dialect': this.dialect,
          'bubble-catcher.created-at': String(Date.now()),
        },
        HostConfig: {
          Memory: this.parseMemoryLimit(memoryLimit),
          MemorySwap: this.parseMemoryLimit(memoryLimit),
          NanoCpus: this.cpuLimitNanoCpus(),
          NetworkMode: 'none',
          ReadonlyRootfs: this.config.readonlyRootfs,
          SecurityOpt: ['no-new-privileges'],
          CapDrop: ['ALL'],
          Tmpfs: this.config.tmpfs,
        },
        NetworkDisabled: true,
        StopTimeout: Math.ceil(timeoutMs / 1000),
      });

      /*
       * Write the query as a file before starting the container, instead of
       * streaming it over stdin: a Docker `attach()` stdin half-close
       * (`.end()`) does not reliably signal EOF to the container process on
       * every Docker Desktop setup, which silently hangs execution until
       * timeout. A file has no such ambiguity.
       */
      await container.putArchive(buildSingleFileTar('query.sql', sql), { path: '/tmp' });
      /* Always overwrite the image's baked-in demo seed — an empty project must run against an empty
       * database, not the leftover demo fixture. */
      await container.putArchive(buildSingleFileTar('seed.sql', seedSql ?? ''), { path: '/tmp' });
      await container.start();

      const withExitCode = container.wait().then(async (inspection) => {
        const logs = (await container!.logs({ stdout: true, stderr: true })) as unknown as Buffer;
        const { stdout, stderr } = this.demuxBuffer(logs);
        return { stdout, stderr, exitCode: inspection.StatusCode ?? 0 } satisfies ContainerExitResult;
      });

      const result = await Promise.race([withExitCode, this.timeoutPromise(timeoutMs)]);

      const executionTimeMs = Date.now() - startTime;

      if (result === 'timeout') {
        const cid = container.id;
        await this.forceRemoveContainer(container);
        container = null;
        return {
          success: false,
          status: 'timeout',
          executionTimeMs,
          error: {
            message: `[${this.dialect}] Query execution exceeded ${timeoutMs}ms timeout`,
            code: 'QUERY_TIMEOUT',
          },
          containerId: cid,
          executedAt: new Date().toISOString(),
        };
      }

      const { stdout, stderr, exitCode } = result as ContainerExitResult;

      if (exitCode !== 0 || stderr) {
        return {
          success: false,
          status: 'error',
          executionTimeMs,
          error: {
            message: `[${this.dialect}] ${stderr || `Process exited with code ${exitCode}`}`,
            code: exitCode !== 0 ? `EXIT_${exitCode}` : 'SQL_ERROR',
          },
          containerId: container.id,
          executedAt: new Date().toISOString(),
        };
      }

      const parsed = this.config.parseOutput(stdout);
      return {
        success: true,
        status: 'success',
        columns: parsed.columns,
        rows: parsed.rows,
        rowCount: parsed.rows.length,
        executionTimeMs,
        containerId: container.id,
        executedAt: new Date().toISOString(),
      };
    } finally {
      if (container) await this.forceRemoveContainer(container);
    }
  }

  /* ── Persistent server containers (Postgres, MySQL, MariaDB, MSSQL) ──────
   * Admin-managed: one long-lived container per dialect, started/stopped explicitly (see
   * sandbox/lifecycle.service.ts) instead of created/destroyed per query. Every project gets its own
   * database inside that one running server (see lib/project-db.ts), so this container serves every
   * user concurrently without paying the server-boot cost on each request. */

  /** Creates and starts the long-lived container for this dialect, waiting for the DB to accept
   * connections before returning. Throws on failure — the caller (lifecycle service) decides how to
   * surface that to the admin. */
  async startPersistent(memoryLimit: string): Promise<{ containerId: string }> {
    if (!this.config.serverBased) {
      throw new Error(`[${this.dialect}] is not a server-based dialect — nothing to start.`);
    }

    const dockerOk = await checkDockerAvailable();
    if (!dockerOk) throw new Error(`[${this.dialect}] Docker is not running.`);

    const imageOk = await checkImageExists(this.imageName);
    if (!imageOk) {
      throw new Error(
        `[${this.dialect}] Docker image '${this.imageName}' not found. Run: cd docker && ./build-images.sh`,
      );
    }

    const binds = this.config.dataVolume
      ? [`${this.config.dataVolume.volumeName}:${this.config.dataVolume.containerPath}`]
      : undefined;

    const container = await docker.createContainer({
      Image: this.imageName,
      Env: this.config.env,
      Labels: {
        'bubble-catcher.managed': 'true',
        'bubble-catcher.role': 'persistent-engine',
        'bubble-catcher.dialect': this.dialect,
        'bubble-catcher.started-at': String(Date.now()),
      },
      HostConfig: {
        Memory: this.parseMemoryLimit(memoryLimit),
        MemorySwap: this.parseMemoryLimit(memoryLimit),
        NanoCpus: this.cpuLimitNanoCpus(),
        NetworkMode: 'none',
        ReadonlyRootfs: false,
        SecurityOpt: ['no-new-privileges'],
        Tmpfs: this.config.tmpfs,
        Binds: binds,
      },
      NetworkDisabled: true,
    });

    try {
      await container.start();

      const readinessDeadline = Date.now() + this.config.readinessTimeoutSec * 1000;
      const ready = await this.waitForReadiness(container, readinessDeadline);
      if (!ready) {
        throw new Error(`Database server failed to become ready within ${this.config.readinessTimeoutSec}s`);
      }

      return { containerId: container.id };
    } catch (err) {
      await this.forceRemoveContainer(container);
      throw err;
    }
  }

  /** Stops and removes a persistent container by id — a no-op (not an error) if it's already gone. */
  async stopPersistent(containerId: string): Promise<void> {
    const container = docker.getContainer(containerId);
    await this.forceRemoveContainer(container);
  }

  /** Drops a project's database inside the persistent container (used during project deletion). */
  async dropDatabaseInContainer(containerId: string, database: string): Promise<void> {
    if (!this.config.dropDatabaseCommand) return;
    const container = docker.getContainer(containerId);
    try {
      await this.execInContainer(container, this.config.dropDatabaseCommand(database));
    } catch (err) {
      console.warn(`[DockerSandboxExecutor] Failed to drop database ${database} in ${this.dialect}:`, err);
    }
  }

  /** Used by lifecycle.service.ts to self-heal: if the DB thinks an engine is running but the
   * container is actually gone (host restart, manual `docker rm`, OOM kill), fall back to `stopped`. */
  async isContainerAlive(containerId: string): Promise<boolean> {
    try {
      const info = await docker.getContainer(containerId).inspect();
      return info.State.Running;
    } catch {
      return false;
    }
  }

  /** Runs `sql` against `database` inside the given already-running container — no create/start/stop,
   * that's the whole point. Ensures the project's database exists first (idempotent, cheap). */
  async executeInContainer(
    containerId: string,
    sql: string,
    timeoutMs: number,
    database: string,
  ): Promise<ExecutionResult> {
    const startTime = Date.now();
    const container = docker.getContainer(containerId);

    try {
      if (this.config.ensureDatabaseCommand) {
        const ensureResult = await Promise.race([
          this.execInContainer(container, this.config.ensureDatabaseCommand(database)),
          this.timeoutPromise(timeoutMs),
        ]);

        if (ensureResult === 'timeout') {
          return {
            success: false,
            status: 'timeout',
            executionTimeMs: Date.now() - startTime,
            error: { message: `[${this.dialect}] Preparing the project database timed out`, code: 'QUERY_TIMEOUT' },
            containerId,
            executedAt: new Date().toISOString(),
          };
        }

        const { exitCode: ensureExitCode, stdout: ensureStdout, stderr: ensureStderr } = ensureResult as ExecResult;
        const cleanEnsureStderr = this.filterStderr(ensureStderr);
        /* Postgres's ensureDatabaseCommand has no IF NOT EXISTS — every call after the first one errors
         * with "already exists" (or MySQL's "database exists"), which is the expected, successful outcome here. */
        const isAlreadyExists =
          /already exists|database exists/i.test(cleanEnsureStderr) ||
          /already exists|database exists/i.test(ensureStdout);
        if (!isAlreadyExists && (ensureExitCode !== 0 || cleanEnsureStderr)) {
          return {
            success: false,
            status: 'error',
            executionTimeMs: Date.now() - startTime,
            error: {
              message: `[${this.dialect}] Failed to prepare project database: ${cleanEnsureStderr || `exit code ${ensureExitCode}`}`,
              code: 'SCHEMA_APPLY_FAILED',
            },
            containerId,
            executedAt: new Date().toISOString(),
          };
        }
      }

      const queryResult = await Promise.race([
        this.execInContainer(container, this.config.buildCommand(sql, database)),
        this.timeoutPromise(timeoutMs),
      ]);

      const executionTimeMs = Date.now() - startTime;

      if (queryResult === 'timeout') {
        return {
          success: false,
          status: 'timeout',
          executionTimeMs,
          error: {
            message: `[${this.dialect}] Query execution exceeded ${timeoutMs}ms timeout`,
            code: 'QUERY_TIMEOUT',
          },
          containerId,
          executedAt: new Date().toISOString(),
        };
      }

      const { stdout, stderr, exitCode } = queryResult as ExecResult;
      const cleanStderr = this.filterStderr(stderr);

      if (exitCode !== 0 || cleanStderr) {
        return {
          success: false,
          status: 'error',
          executionTimeMs,
          error: {
            message: `[${this.dialect}] ${cleanStderr || `Command exited with code ${exitCode}`}`,
            code: exitCode !== 0 ? `EXIT_${exitCode}` : 'SQL_ERROR',
          },
          containerId,
          executedAt: new Date().toISOString(),
        };
      }

      const parsed = this.config.parseOutput(stdout);
      return {
        success: true,
        status: 'success',
        columns: parsed.columns,
        rows: parsed.rows,
        rowCount: parsed.rows.length,
        executionTimeMs,
        containerId,
        executedAt: new Date().toISOString(),
      };
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      return {
        success: false,
        status: 'error',
        executionTimeMs: Date.now() - startTime,
        error: { message: `[${this.dialect}] Sandbox execution failed: ${message}`, code: 'SANDBOX_ERROR' },
        containerId,
        executedAt: new Date().toISOString(),
      };
    }
  }

  /* ───────────────────────── Helpers ─────────────────────────────── */

  /**
   * Poll the container's health check command until it succeeds or deadline.
   */
  private async waitForReadiness(container: Docker.Container, deadline: number): Promise<boolean> {
    while (Date.now() < deadline) {
      try {
        const { exitCode } = await this.execInContainer(container, this.config.healthCheck);
        if (exitCode === 0) return true;
      } catch {
        /* container might not be ready yet */
      }
      await this.sleep(this.config.readinessPollMs);
    }
    return false;
  }

  /**
   * Execute a command inside a running container and capture stdout/stderr.
   */
  private async execInContainer(container: Docker.Container, cmd: string[]): Promise<ExecResult> {
    const exec = await container.exec({
      Cmd: cmd,
      AttachStdout: true,
      AttachStderr: true,
    });

    const stream = await exec.start({ hijack: true, stdin: false });

    return new Promise<ExecResult>((resolve, reject) => {
      let stdout = '';
      let stderr = '';

      stream.on('data', (chunk: Buffer) => {
        /*
         * Docker multiplexed stream format:
         *   header[0]   = stream type (1=stdout, 2=stderr)
         *   header[1-3] = reserved
         *   header[4-7] = payload length (big-endian uint32)
         *   followed by payload bytes
         */
        let offset = 0;
        while (offset < chunk.length) {
          if (offset + 8 > chunk.length) {
            /* Partial header — treat remainder as raw stdout */
            stdout += chunk.subarray(offset).toString('utf-8');
            break;
          }
          const streamType = chunk[offset];
          const payloadLen = chunk.readUInt32BE(offset + 4);
          const payload = chunk.subarray(offset + 8, offset + 8 + payloadLen).toString('utf-8');

          if (streamType === 2) {
            stderr += payload;
          } else {
            stdout += payload;
          }
          offset += 8 + payloadLen;
        }
      });

      stream.on('end', async () => {
        try {
          const inspection = await exec.inspect();
          resolve({ stdout, stderr, exitCode: inspection.ExitCode ?? 0 });
        } catch (e) {
          reject(e);
        }
      });

      stream.on('error', reject);
    });
  }

  /** Splits a Docker multiplexed logs buffer (same framing as container.exec() streams) into stdout/stderr. */
  private demuxBuffer(chunk: Buffer): { stdout: string; stderr: string } {
    let stdout = '';
    let stderr = '';
    let offset = 0;
    while (offset < chunk.length) {
      if (offset + 8 > chunk.length) {
        stdout += chunk.subarray(offset).toString('utf-8');
        break;
      }
      const streamType = chunk[offset];
      const payloadLen = chunk.readUInt32BE(offset + 4);
      const payload = chunk.subarray(offset + 8, offset + 8 + payloadLen).toString('utf-8');

      if (streamType === 2) stderr += payload;
      else stdout += payload;
      offset += 8 + payloadLen;
    }
    return { stdout, stderr };
  }

  /**
   * Filter engine-specific noise from stderr that isn't a real error.
   * MySQL/MariaDB print warnings to stderr even on success.
   */
  private filterStderr(raw: string): string {
    return raw
      .split('\n')
      .filter((line) => {
        const l = line.trim();
        if (!l) return false;
        /* mysql CLI warning about password on command line */
        if (l.includes('Using a password on the command line interface can be insecure')) return false;
        /* MariaDB password warning */
        if (l.includes('password on the command line')) return false;
        /* Postgres informational notices (e.g. relation already exists, sequence created) */
        if (l.startsWith('NOTICE:') || l.startsWith('INFO:')) return false;
        /* MSSQL sqlcmd informational messages */
        if (l.startsWith('Changed database context to')) return false;
        if (l.match(/^\(\d+ rows? affected\)$/)) return false;
        return true;
      })
      .join('\n')
      .trim();
  }

  private timeoutPromise(ms: number): Promise<'timeout'> {
    return new Promise((resolve) => setTimeout(() => resolve('timeout'), ms));
  }

  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  private async forceRemoveContainer(container: Docker.Container): Promise<void> {
    try {
      await container.stop({ t: 2 }).catch(() => {});
      await container.remove({ force: true, v: false });
    } catch {
      /* Container may already be removed */
    }
  }

  /** Converts config.sandboxCpuLimit (fractional CPUs, e.g. 0.5) to Docker's NanoCpus unit. */
  private cpuLimitNanoCpus(): number {
    return Math.round(config.sandboxCpuLimit * 1_000_000_000);
  }

  private parseMemoryLimit(limit: string): number {
    const match = limit.match(/^(\d+)([kmg]?)b?$/i);
    if (!match) return 128 * 1024 * 1024; // default 128MB

    const value = parseInt(match[1], 10);
    const unit = (match[2] || 'm').toLowerCase();

    switch (unit) {
      case 'k':
        return value * 1024;
      case 'm':
        return value * 1024 * 1024;
      case 'g':
        return value * 1024 * 1024 * 1024;
      default:
        return value;
    }
  }
}

interface ContainerExitResult {
  stdout: string;
  stderr: string;
  exitCode: number;
}

interface ExecResult {
  stdout: string;
  stderr: string;
  exitCode: number;
}
