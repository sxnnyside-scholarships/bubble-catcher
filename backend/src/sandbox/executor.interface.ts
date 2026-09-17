import type { ExecutionResult, SupportedDialect } from '@shared/types';

/**
 * Abstract sandbox executor interface.
 * Each dialect implements this to run queries in isolated containers.
 */
export interface SandboxExecutor {
  readonly dialect: SupportedDialect;
  readonly imageName: string;

  /** Ephemeral path — sqlite/libsql only. `seedSql`, when non-empty, is applied before `sql` in the
   * same throwaway container. */
  execute(sql: string, timeoutMs: number, memoryLimit: string, seedSql?: string): Promise<ExecutionResult>;

  /** Persistent path — server-based dialects only (see sandbox/lifecycle.service.ts). */
  startPersistent?(memoryLimit: string): Promise<{ containerId: string }>;
  stopPersistent?(containerId: string): Promise<void>;
  isContainerAlive?(containerId: string): Promise<boolean>;
  executeInContainer?(containerId: string, sql: string, timeoutMs: number, database: string): Promise<ExecutionResult>;
  dropDatabaseInContainer?(containerId: string, database: string): Promise<void>;
}
