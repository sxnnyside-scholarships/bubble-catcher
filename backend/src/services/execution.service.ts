import type {
  ExecutionHistoryEntry,
  ExecutionResult,
  ExplainPlanResult,
  PaginatedResponse,
  SupportedDialect,
} from '@shared/types';
import { isServerBasedDialect, isSupportedDialect } from '@shared/types';
import { count, desc, eq } from 'drizzle-orm';
import { config } from '../config';
import { db } from '../db/client';
import { executionHistoryTable, projectsTable } from '../db/schema';
import { toExecutionHistoryDto } from '../dto/execution.dto';
import { AppError } from '../lib/errors';
import { hashQuery, logger } from '../lib/logger';
import { type PaginationParams, parsePagination, toPaginatedResponse } from '../lib/pagination';
import { guardQuery } from '../lib/query-guard';
import { sandboxService } from '../sandbox';
import { recordAudit } from './audit.service';
import { explainParserService } from './explain-parser.service';
import { executionRateLimiter } from './rate-limiter';
import { recordTelemetry } from './telemetry.service';
import { getUsageLimits } from './usage-limits';

export class ExecutionService {
  /** Execute a query in the sandbox and record history */
  async execute(userId: string, projectId: string, sql: string, dialect: string): Promise<ExecutionResult> {
    if (!sql || !sql.trim()) {
      throw AppError.badRequest('EMPTY_QUERY');
    }

    if (!isSupportedDialect(dialect)) {
      throw AppError.badRequest('UNSUPPORTED_DIALECT', { dialect });
    }

    if (!config.enabledDialects.includes(dialect)) {
      throw AppError.badRequest('DIALECT_DISABLED', {
        dialect,
        enabled: config.enabledDialects,
        reason: 'This dialect has been disabled by the instance operator.',
      });
    }

    const limits = getUsageLimits();

    if (sql.length > limits.maxQueryLength) {
      throw AppError.forbidden('QUERY_LENGTH_EXCEEDED', { max: limits.maxQueryLength, current: sql.length });
    }

    if (!executionRateLimiter.check(userId, limits.maxExecutionsPerMinute)) {
      const retryAfter = executionRateLimiter.getRetryAfter(userId);
      throw new AppError('RATE_LIMIT_EXCEEDED', 'RATE_LIMIT_EXCEEDED', 429, {
        maxPerMinute: limits.maxExecutionsPerMinute,
        retryAfter,
      });
    }

    const guard = guardQuery(sql, dialect);
    if (guard.blocked) {
      logger.warn('query_guard.blocked', { userId, dialect, queryHash: hashQuery(sql), reason: guard.reason });
      throw AppError.unprocessable('QUERY_TOO_EXPENSIVE', { reason: guard.reason });
    }

    /* Record rate hit before executing (prevents bursts during execution) */
    executionRateLimiter.record(userId);

    /*
     * Server-based dialects (postgres/mysql/mariadb/mssql) run against the project's own database
     * inside the admin-started, long-lived container — the database itself is the persistence, no
     * replay needed. Non-server dialects (sqlite/libsql) still boot a fresh in-process engine per
     * query, so the project's schema/seed statements are replayed first — see schema.service.ts.
     *
     * sandboxService.execute never throws for SQL runtime errors —
     * those come back as status:'error'/'timeout'/'killed' in the result.
     * Only true infrastructure failures (Docker unavailable, etc.)
     * produce exceptions, which the global error handler maps to 500.
     */
    let result: ExecutionResult;
    if (isServerBasedDialect(dialect)) {
      result = await sandboxService.execute(sql, dialect, limits.maxExecutionTimeMs, { projectId });
    } else {
      const [project] = await db
        .select({ schemaStatements: projectsTable.schemaStatements })
        .from(projectsTable)
        .where(eq(projectsTable.id, projectId));
      const seedSql = project?.schemaStatements.map((s) => s.sql).join('\n');
      result = await sandboxService.execute(sql, dialect, limits.maxExecutionTimeMs, { seedSql });
    }

    /* Audit + Telemetry + History (best-effort, non-blocking) */
    recordAudit({ userId, dialect, status: result.status, executionTimeMs: result.executionTimeMs, sql }).catch(
      () => {},
    );

    recordTelemetry({
      userId,
      eventType: 'EXECUTION',
      dialect,
      executionTimeMs: result.executionTimeMs,
      success: result.success,
      sql,
    }).catch(() => {});

    this.recordExecution(userId, projectId, sql, dialect, result).catch((err) => {
      logger.error('execution.history_failed', { reason: err instanceof Error ? err.message : String(err) });
    });

    logger.info('execution.completed', {
      userId,
      dialect,
      executionStatus: result.status,
      executionTimeMs: result.executionTimeMs,
      queryHash: hashQuery(sql),
    });

    return result;
  }

  /** Execute EXPLAIN (ANALYZE) query and return normalized hierarchy */
  async explain(_userId: string, projectId: string, sql: string, dialect: string): Promise<ExplainPlanResult> {
    if (!sql || !sql.trim()) {
      throw AppError.badRequest('EMPTY_QUERY');
    }
    if (!isSupportedDialect(dialect)) {
      throw AppError.badRequest('UNSUPPORTED_DIALECT', { dialect });
    }

    const limits = getUsageLimits();
    const guard = guardQuery(sql, dialect);
    if (guard.blocked) {
      throw AppError.unprocessable('QUERY_TOO_EXPENSIVE', { reason: guard.reason });
    }

    const cleanSql = sql.trim().replace(/;+$/, '');
    let explainSql: string;

    if (dialect === 'postgresql') {
      explainSql = `EXPLAIN (ANALYZE, BUFFERS, FORMAT JSON) ${cleanSql};`;
    } else if (dialect === 'mysql' || dialect === 'mariadb') {
      explainSql = `EXPLAIN FORMAT=JSON ${cleanSql};`;
    } else if (dialect === 'sqlite' || dialect === 'libsql') {
      explainSql = `EXPLAIN QUERY PLAN ${cleanSql};`;
    } else {
      explainSql = `EXPLAIN ${cleanSql};`;
    }

    let execResult: ExecutionResult;
    if (isServerBasedDialect(dialect)) {
      execResult = await sandboxService.execute(explainSql, dialect, limits.maxExecutionTimeMs, { projectId });
    } else {
      const [project] = await db
        .select({ schemaStatements: projectsTable.schemaStatements })
        .from(projectsTable)
        .where(eq(projectsTable.id, projectId));
      const seedSql = project?.schemaStatements.map((s) => s.sql).join('\n');
      execResult = await sandboxService.execute(explainSql, dialect, limits.maxExecutionTimeMs, { seedSql });
    }

    if (!execResult.success) {
      throw AppError.badRequest('EXPLAIN_FAILED', {
        error: execResult.error?.message || 'Failed to explain query in sandbox',
      });
    }

    let rawOutput = '';
    if (execResult.rows && execResult.rows.length > 0) {
      if (dialect === 'postgresql' || dialect === 'mysql' || dialect === 'mariadb') {
        const firstCol = execResult.rows[0]?.[0];
        rawOutput = typeof firstCol === 'string' ? firstCol : JSON.stringify(firstCol);
      } else if (dialect === 'sqlite' || dialect === 'libsql') {
        rawOutput = JSON.stringify(
          execResult.rows.map((r) => ({
            id: r[0],
            parent: r[1],
            notused: r[2],
            detail: r[3],
          })),
        );
      } else {
        rawOutput = execResult.rows.map((r) => r.join(' | ')).join('\n');
      }
    }

    return explainParserService.parse(rawOutput, dialect as SupportedDialect, execResult.executionTimeMs);
  }

  /** Get execution history for a project, paginated */
  async getHistory(
    projectId: string,
    pagination: PaginationParams = parsePagination({}),
  ): Promise<PaginatedResponse<ExecutionHistoryEntry>> {
    const [rows, [{ value: total }]] = await Promise.all([
      db
        .select()
        .from(executionHistoryTable)
        .where(eq(executionHistoryTable.projectId, projectId))
        .orderBy(desc(executionHistoryTable.createdAt))
        .limit(pagination.pageSize)
        .offset(pagination.offset),
      db.select({ value: count() }).from(executionHistoryTable).where(eq(executionHistoryTable.projectId, projectId)),
    ]);

    return toPaginatedResponse(rows.map(toExecutionHistoryDto), total, pagination);
  }

  private async recordExecution(
    userId: string,
    projectId: string,
    sql: string,
    dialect: SupportedDialect,
    result: ExecutionResult,
  ): Promise<void> {
    const summaryParts: string[] = [];
    if (result.success && result.rowCount != null) {
      summaryParts.push(`${result.rowCount} rows`);
    }
    summaryParts.push(`${result.executionTimeMs}ms`);

    try {
      await db.insert(executionHistoryTable).values({
        projectId,
        userId,
        sql,
        dialect,
        status: result.status,
        resultSummary: summaryParts.join(', ') || null,
        error: result.error?.message ?? null,
        executionTimeMs: result.executionTimeMs ?? null,
      });
    } catch (err) {
      /* Non-critical — log but don't fail the execution */
      logger.error('execution.record_failed', { reason: err instanceof Error ? err.message : String(err) });
    }
  }
}

export const executionService = new ExecutionService();
