import type { EngineState, ExecutionResult, ServerBasedDialect, SupportedDialect } from '@shared/types';
import { isServerBasedDialect, isSupportedDialect, SUPPORTED_DIALECTS } from '@shared/types';
import { config } from '../config';
import { AppError } from '../lib/errors';
import { projectDatabaseName } from '../lib/project-db';
import { DockerSandboxExecutor } from './docker-executor';
import type { SandboxExecutor } from './executor.interface';
import { getAllEngineStates, getContainerId, startEngine, stopEngine } from './lifecycle.service';

export interface ExecuteOptions {
  /** Non-server dialects only — the project's replayed schema/seed script. */
  seedSql?: string;
  /** Server-based dialects only — selects the project's own database inside the shared container. */
  projectId?: string;
}

/** Maps each dialect to its sandbox executor. */
export class SandboxService {
  private readonly executors = new Map<SupportedDialect, SandboxExecutor>();

  constructor() {
    for (const dialect of SUPPORTED_DIALECTS) {
      this.executors.set(dialect, new DockerSandboxExecutor(dialect));
    }
  }

  async execute(sql: string, dialect: string, timeoutMs?: number, options?: ExecuteOptions): Promise<ExecutionResult> {
    if (!isSupportedDialect(dialect)) {
      throw AppError.badRequest('UNSUPPORTED_DIALECT', { dialect });
    }

    const executor = this.executors.get(dialect);
    if (!executor) {
      throw AppError.internal('INTERNAL_ERROR', { dialect });
    }

    if (isServerBasedDialect(dialect)) {
      const containerId = await getContainerId(dialect, executor);
      if (!containerId) {
        return {
          success: false,
          status: 'error',
          executionTimeMs: 0,
          error: {
            message: `[${dialect}] This engine isn't running. Ask an administrator to start it from the Administration panel.`,
            code: 'SANDBOX_OFFLINE',
          },
          executedAt: new Date().toISOString(),
        };
      }

      const database = options?.projectId ? projectDatabaseName(options.projectId) : 'sandbox';
      return executor.executeInContainer!(containerId, sql, timeoutMs ?? config.sandboxTimeoutMs, database);
    }

    return executor.execute(sql, timeoutMs ?? config.sandboxTimeoutMs, config.sandboxMemoryLimit, options?.seedSql);
  }

  async startEngine(dialect: ServerBasedDialect): Promise<EngineState> {
    const executor = this.executors.get(dialect);
    if (!executor) throw AppError.badRequest('UNSUPPORTED_DIALECT', { dialect });
    try {
      return await startEngine(dialect, executor);
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      throw AppError.internal('ENGINE_START_FAILED', { dialect, reason: message });
    }
  }

  async stopEngine(dialect: ServerBasedDialect): Promise<EngineState> {
    const executor = this.executors.get(dialect);
    if (!executor) throw AppError.badRequest('UNSUPPORTED_DIALECT', { dialect });
    return stopEngine(dialect, executor);
  }

  async getEngineStates(): Promise<EngineState[]> {
    const serverExecutors = new Map<ServerBasedDialect, SandboxExecutor>();
    for (const [dialect, executor] of this.executors) {
      if (isServerBasedDialect(dialect)) serverExecutors.set(dialect, executor);
    }
    return getAllEngineStates(serverExecutors);
  }

  /** Clean up isolated project database when a project is deleted (best-effort) */
  async dropProjectDatabase(dialect: string, projectId: string): Promise<void> {
    if (!isServerBasedDialect(dialect)) return;
    const executor = this.executors.get(dialect);
    if (!executor || !executor.dropDatabaseInContainer) return;
    const containerId = await getContainerId(dialect, executor);
    if (!containerId) return;
    const database = projectDatabaseName(projectId);
    await executor.dropDatabaseInContainer(containerId, database);
  }

  /** Register a custom executor (for extension/testing) */
  registerExecutor(executor: SandboxExecutor): void {
    this.executors.set(executor.dialect, executor);
  }
}

/** Singleton service instance */
export const sandboxService = new SandboxService();
