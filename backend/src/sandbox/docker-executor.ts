import Docker from 'dockerode';
import type { ExecutionResult, ExecutionColumn } from '@shared/types';
import type { SupportedDialect } from '@shared/types';
import type { SandboxExecutor } from './executor.interface';

const docker = new Docker();

/* ───────────────────────── Dialect configuration ───────────────────────── */

interface DialectConfig {
  image: string;
  /** Environment variables passed to the container */
  env: string[];
  /** Whether this dialect requires a running database server */
  serverBased: boolean;
  /**
   * Build the command to execute the user query.
   * For server-based dialects this runs inside container.exec().
   * For non-server dialects this becomes the container Cmd.
   */
  buildCommand: (sql: string) => string[];
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
  parseOutput: (stdout: string) => { columns: ExecutionColumn[]; rows: Record<string, unknown>[] };
}

const DIALECT_CONFIGS: Record<SupportedDialect, DialectConfig> = {
  /* ── SQLite ─────────────────────────────────────────────────────────── */
  sqlite: {
    image: 'bubble-catcher-sqlite:latest',
    env: [],
    serverBased: false,
    // Use :memory: so we never hit filesystem permission issues.
    // We pipe the seed + user query via a shell command.
    buildCommand: (sql) => [
      'sh', '-c',
      `cat /tmp/seed.sql - <<'__END_SQL__' | sqlite3 -header -separator '\t' :memory:\n${sql}\n__END_SQL__`,
    ],
    healthCheck: [],
    readinessTimeoutSec: 0,
    readinessPollMs: 0,
    readonlyRootfs: false, // sqlite3 CLI needs writable /tmp for its rc file
    parseOutput: parseTsvOutput,
  },

  /* ── PostgreSQL ─────────────────────────────────────────────────────── */
  postgresql: {
    image: 'bubble-catcher-postgres:latest',
    env: ['POSTGRES_PASSWORD=sandbox', 'POSTGRES_DB=sandbox'],
    serverBased: true,
    buildCommand: (sql) => [
      'psql', '-h', '127.0.0.1', '-U', 'postgres', '-d', 'sandbox',
      '-c', sql,
      '--no-align', '-P', 'tuples_only=off', '-P', 'fieldsep=\t', '-P', 'footer=off',
    ],
    healthCheck: ['pg_isready', '-h', '127.0.0.1', '-U', 'postgres'],
    readinessTimeoutSec: 30,
    readinessPollMs: 500,
    readonlyRootfs: false,
    tmpfs: { '/run/postgresql': 'rw,noexec,nosuid,size=16m' },
    parseOutput: parseTsvOutput,
  },

  /* ── MySQL ──────────────────────────────────────────────────────────── */
  mysql: {
    image: 'bubble-catcher-mysql:latest',
    env: ['MYSQL_ROOT_PASSWORD=sandbox', 'MYSQL_DATABASE=sandbox'],
    serverBased: true,
    buildCommand: (sql) => [
      'mysql', '-h', '127.0.0.1', '-u', 'root', '-psandbox', 'sandbox',
      '-e', sql, '--batch', '--raw',
    ],
    healthCheck: ['mysqladmin', 'ping', '-h', '127.0.0.1', '-u', 'root', '-psandbox', '--silent'],
    readinessTimeoutSec: 60,
    readinessPollMs: 1000,
    readonlyRootfs: false,
    parseOutput: parseTsvOutput,
  },

  /* ── MariaDB ────────────────────────────────────────────────────────── */
  mariadb: {
    image: 'bubble-catcher-mariadb:latest',
    env: ['MYSQL_ROOT_PASSWORD=sandbox', 'MYSQL_DATABASE=sandbox'],
    serverBased: true,
    buildCommand: (sql) => [
      'mariadb', '-h', '127.0.0.1', '-u', 'root', '-psandbox', 'sandbox',
      '-e', sql, '--batch', '--raw',
    ],
    healthCheck: ['mariadb-admin', 'ping', '-h', '127.0.0.1', '-u', 'root', '-psandbox', '--silent'],
    readinessTimeoutSec: 60,
    readinessPollMs: 1000,
    readonlyRootfs: false,
    parseOutput: parseTsvOutput,
  },

  /* ── MSSQL ──────────────────────────────────────────────────────────── */
  mssql: {
    image: 'bubble-catcher-mssql:latest',
    env: ['ACCEPT_EULA=Y', 'SA_PASSWORD=Sandbox123!', 'MSSQL_PID=Developer'],
    serverBased: true,
    buildCommand: (sql) => [
      '/opt/mssql-tools18/bin/sqlcmd',
      '-S', '127.0.0.1', '-U', 'sa', '-P', 'Sandbox123!',
      '-d', 'sandbox', '-Q', sql,
      '-s', '\t', '-W', '-C',
    ],
    healthCheck: [
      '/opt/mssql-tools18/bin/sqlcmd',
      '-S', '127.0.0.1', '-U', 'sa', '-P', 'Sandbox123!',
      '-Q', 'SELECT 1', '-C',
    ],
    readinessTimeoutSec: 45,
    readinessPollMs: 2000,
    readonlyRootfs: false,
    parseOutput: parseMssqlOutput,
  },
};

/* ───────────────────────── Output parsers ───────────────────────────── */

function parseTsvOutput(stdout: string): { columns: ExecutionColumn[]; rows: Record<string, unknown>[] } {
  const lines = stdout.trim().split('\n').filter(Boolean);
  if (lines.length === 0) return { columns: [], rows: [] };

  const headers = lines[0].split('\t');
  const columns: ExecutionColumn[] = headers.map((h) => ({ name: h.trim(), type: 'text' }));
  const rows = lines.slice(1).map((line) => {
    const values = line.split('\t');
    const row: Record<string, unknown> = {};
    headers.forEach((header, i) => {
      row[header.trim()] = values[i]?.trim() ?? null;
    });
    return row;
  });

  return { columns, rows };
}

function parseMssqlOutput(stdout: string): { columns: ExecutionColumn[]; rows: Record<string, unknown>[] } {
  const lines = stdout.trim().split('\n').filter(Boolean);
  if (lines.length < 2) return { columns: [], rows: [] };

  /* MSSQL output: header row, separator row (---), then data rows, then (N rows affected) */
  const headers = lines[0].split('\t').map((h) => h.trim());
  const columns: ExecutionColumn[] = headers.map((h) => ({ name: h, type: 'text' }));

  const dataLines = lines.slice(2).filter((line) => !line.match(/^\(\d+ rows? affected\)$/));
  const rows = dataLines.map((line) => {
    const values = line.split('\t');
    const row: Record<string, unknown> = {};
    headers.forEach((header, i) => {
      row[header] = values[i]?.trim() ?? null;
    });
    return row;
  });

  return { columns, rows };
}

/* ───────────────────────── Executor ─────────────────────────────────── */

/**
 * Docker-based sandbox executor.
 *
 * **Non-server dialects** (SQLite): creates a container whose Cmd runs the
 * query directly, waits for it to exit, collects output, removes it.
 *
 * **Server-based dialects** (Postgres, MySQL, MariaDB, MSSQL): creates a
 * container with the default entrypoint so the database server starts,
 * polls for readiness via `container.exec()`, then executes the user query
 * via a second `container.exec()`, collects output, and removes the
 * container. This avoids the previous bug where the Cmd override prevented
 * the database from ever starting.
 */
export class DockerSandboxExecutor implements SandboxExecutor {
  readonly dialect: SupportedDialect;
  readonly imageName: string;
  private readonly config: DialectConfig;

  constructor(dialect: SupportedDialect) {
    this.dialect = dialect;
    this.config = DIALECT_CONFIGS[dialect];
    this.imageName = this.config.image;
  }

  async execute(sql: string, timeoutMs: number, memoryLimit: string): Promise<ExecutionResult> {
    const startTime = Date.now();

    try {
      if (this.config.serverBased) {
        return await this.executeServerBased(sql, timeoutMs, memoryLimit, startTime);
      }
      return await this.executeNonServer(sql, timeoutMs, memoryLimit, startTime);
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      return {
        status: 'error',
        data: null,
        error: `Sandbox execution failed: ${message}`,
        containerId: 'unknown',
        executedAt: new Date().toISOString(),
      };
    }
  }

  /* ── Non-server execution (SQLite) ──────────────────────────────── */

  private async executeNonServer(
    sql: string,
    timeoutMs: number,
    memoryLimit: string,
    startTime: number,
  ): Promise<ExecutionResult> {
    let container: Docker.Container | null = null;
    try {
      container = await docker.createContainer({
        Image: this.config.image,
        Env: this.config.env,
        Cmd: this.config.buildCommand(sql),
        HostConfig: {
          Memory: this.parseMemoryLimit(memoryLimit),
          MemorySwap: this.parseMemoryLimit(memoryLimit),
          NanoCpus: 500_000_000, // 0.5 CPU
          NetworkMode: 'none',
          ReadonlyRootfs: this.config.readonlyRootfs,
          SecurityOpt: ['no-new-privileges'],
          CapDrop: ['ALL'],
          Tmpfs: this.config.tmpfs,
        },
        NetworkDisabled: true,
        StopTimeout: Math.ceil(timeoutMs / 1000),
      });

      await container.start();

      const result = await Promise.race([
        this.waitForContainerExit(container),
        this.timeoutPromise(timeoutMs),
      ]);

      const executionTimeMs = Date.now() - startTime;

      if (result === 'timeout') {
        const cid = container.id;
        await this.forceRemoveContainer(container);
        container = null;
        return {
          status: 'timeout',
          data: null,
          error: `Query execution exceeded ${timeoutMs}ms timeout`,
          containerId: cid,
          executedAt: new Date().toISOString(),
        };
      }

      const { stdout, stderr, exitCode } = result as ContainerExitResult;

      if (exitCode !== 0 || stderr) {
        const cid = container.id;
        return {
          status: 'error',
          data: null,
          error: stderr || `Process exited with code ${exitCode}`,
          containerId: cid,
          executedAt: new Date().toISOString(),
        };
      }

      const parsed = this.config.parseOutput(stdout);
      return {
        status: 'success',
        data: {
          columns: parsed.columns,
          rows: parsed.rows,
          rowCount: parsed.rows.length,
          executionTimeMs,
        },
        error: null,
        containerId: container.id,
        executedAt: new Date().toISOString(),
      };
    } finally {
      if (container) await this.forceRemoveContainer(container);
    }
  }

  /* ── Server-based execution (Postgres, MySQL, MariaDB, MSSQL) ────── */

  private async executeServerBased(
    sql: string,
    timeoutMs: number,
    memoryLimit: string,
    startTime: number,
  ): Promise<ExecutionResult> {
    let container: Docker.Container | null = null;
    try {
      /* 1. Create and start container with DEFAULT entrypoint (DB server starts) */
      container = await docker.createContainer({
        Image: this.config.image,
        Env: this.config.env,
        /* No Cmd override — use image's default entrypoint/cmd */
        HostConfig: {
          Memory: this.parseMemoryLimit(memoryLimit),
          MemorySwap: this.parseMemoryLimit(memoryLimit),
          NanoCpus: 500_000_000,
          NetworkMode: 'none',
          ReadonlyRootfs: false, // server engines need writable fs
          SecurityOpt: ['no-new-privileges'],
          Tmpfs: this.config.tmpfs,
        },
        NetworkDisabled: true,
      });

      await container.start();

      /* 2. Wait for DB readiness */
      const readinessDeadline = Date.now() + (this.config.readinessTimeoutSec * 1000);
      const ready = await this.waitForReadiness(container, readinessDeadline);

      if (!ready) {
        const cid = container.id;
        await this.forceRemoveContainer(container);
        container = null;
        return {
          status: 'error',
          data: null,
          error: `Database server failed to become ready within ${this.config.readinessTimeoutSec}s`,
          containerId: cid,
          executedAt: new Date().toISOString(),
        };
      }

      /* 3. Execute user query via container.exec() */
      const queryCmd = this.config.buildCommand(sql);

      const queryResult = await Promise.race([
        this.execInContainer(container, queryCmd),
        this.timeoutPromise(timeoutMs),
      ]);

      const executionTimeMs = Date.now() - startTime;

      if (queryResult === 'timeout') {
        const cid = container.id;
        await this.forceRemoveContainer(container);
        container = null;
        return {
          status: 'timeout',
          data: null,
          error: `Query execution exceeded ${timeoutMs}ms timeout`,
          containerId: cid,
          executedAt: new Date().toISOString(),
        };
      }

      const { stdout, stderr, exitCode } = queryResult as ExecResult;

      /* Filter engine-specific noise from stderr */
      const cleanStderr = this.filterStderr(stderr);

      if (exitCode !== 0 || cleanStderr) {
        return {
          status: 'error',
          data: null,
          error: cleanStderr || `Command exited with code ${exitCode}`,
          containerId: container.id,
          executedAt: new Date().toISOString(),
        };
      }

      const parsed = this.config.parseOutput(stdout);
      return {
        status: 'success',
        data: {
          columns: parsed.columns,
          rows: parsed.rows,
          rowCount: parsed.rows.length,
          executionTimeMs,
        },
        error: null,
        containerId: container.id,
        executedAt: new Date().toISOString(),
      };
    } finally {
      if (container) await this.forceRemoveContainer(container);
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

  /**
   * Wait for a container to exit and collect its logs.
   * Used for non-server (one-shot) containers like SQLite.
   */
  private async waitForContainerExit(container: Docker.Container): Promise<ContainerExitResult> {
    const stream = await container.logs({ follow: true, stdout: true, stderr: true });

    return new Promise((resolve, reject) => {
      let stdout = '';
      let stderr = '';

      stream.on('data', (chunk: Buffer) => {
        /* Docker multiplexed stream: first 8 bytes are header */
        if (chunk.length > 8) {
          const streamType = chunk[0];
          const payload = chunk.subarray(8).toString('utf-8');

          if (streamType === 2) {
            stderr += payload;
          } else if (streamType === 1) {
            stdout += payload;
          } else {
            stdout += chunk.toString('utf-8');
          }
        } else {
          stdout += chunk.toString('utf-8');
        }
      });

      stream.on('end', async () => {
        try {
          const inspection = await container.inspect();
          resolve({
            stdout,
            stderr,
            exitCode: inspection.State.ExitCode ?? 0,
          });
        } catch (e) {
          reject(e);
        }
      });

      stream.on('error', reject);
    });
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
      await container.remove({ force: true, v: true });
    } catch {
      /* Container may already be removed */
    }
  }

  private parseMemoryLimit(limit: string): number {
    const match = limit.match(/^(\d+)([kmg]?)b?$/i);
    if (!match) return 128 * 1024 * 1024; // default 128MB

    const value = parseInt(match[1], 10);
    const unit = (match[2] || 'm').toLowerCase();

    switch (unit) {
      case 'k': return value * 1024;
      case 'm': return value * 1024 * 1024;
      case 'g': return value * 1024 * 1024 * 1024;
      default: return value;
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
