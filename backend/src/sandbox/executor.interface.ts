import type { ExecutionResult } from '@shared/types';
import type { SupportedDialect } from '@shared/types';

/**
 * Abstract sandbox executor interface.
 * Each dialect implements this to run queries in isolated containers.
 */
export interface SandboxExecutor {
  readonly dialect: SupportedDialect;
  readonly imageName: string;
  execute(sql: string, timeoutMs: number, memoryLimit: string): Promise<ExecutionResult>;
}
