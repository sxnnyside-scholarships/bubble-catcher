import type { SupportedDialect, ExecutionResult } from '@shared/types';
import { isSupportedDialect, isEnterpriseDialect } from '@shared/types';
import { DockerSandboxExecutor } from './docker-executor';
import type { SandboxExecutor } from './executor.interface';
import { AppError } from '../lib/errors';
import { config } from '../config';

/**
 * Manages sandbox executors for each dialect.
 * Provides a unified interface for executing queries in isolated containers.
 */
export class SandboxService {
  private readonly executors = new Map<SupportedDialect, SandboxExecutor>();

  constructor() {
    /* Initialize executors for all supported dialects */
    const dialects: SupportedDialect[] = ['mysql', 'mariadb', 'postgresql', 'sqlite', 'mssql'];
    for (const dialect of dialects) {
      this.executors.set(dialect, new DockerSandboxExecutor(dialect));
    }
  }

  async execute(sql: string, dialect: string, timeoutMs?: number): Promise<ExecutionResult> {
    if (isEnterpriseDialect(dialect)) {
      throw AppError.forbidden('ENTERPRISE_REQUIRED', { dialect });
    }

    if (!isSupportedDialect(dialect)) {
      throw AppError.badRequest('UNSUPPORTED_DIALECT', { dialect });
    }

    const executor = this.executors.get(dialect);
    if (!executor) {
      throw AppError.internal('INTERNAL_ERROR', { dialect });
    }

    return executor.execute(
      sql,
      timeoutMs ?? config.sandboxTimeoutMs,
      config.sandboxMemoryLimit,
    );
  }

  /** Register a custom executor (for extension/testing) */
  registerExecutor(executor: SandboxExecutor): void {
    this.executors.set(executor.dialect, executor);
  }
}

/** Singleton service instance */
export const sandboxService = new SandboxService();
