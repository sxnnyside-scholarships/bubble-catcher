import { sandboxService } from '../sandbox';
import { createUserClient, supabaseAdmin } from '../lib/supabase';
import { AppError } from '../lib/errors';
import { getPlanLimits } from './plan-limits';
import { executionRateLimiter } from './rate-limiter';
import { recordAudit } from './audit.service';
import { recordTelemetry } from './telemetry.service';
import { guardQuery } from '../lib/query-guard';
import { logger, hashQuery } from '../lib/logger';
import { isSupportedDialect, isEnterpriseDialect } from '@shared/types';
import type { ExecutionResult, ExecutionHistoryEntry } from '@shared/types';

export class ExecutionService {
  /** Execute a query in the sandbox and record history */
  async execute(
    userId: string,
    projectId: string,
    sql: string,
    dialect: string,
    accessToken: string,
  ): Promise<ExecutionResult> {
    if (!sql || !sql.trim()) {
      throw AppError.badRequest('EMPTY_QUERY');
    }

    /* ── Strict dialect validation ─────────────────────────────── */
    if (isEnterpriseDialect(dialect)) {
      throw AppError.forbidden('ENTERPRISE_REQUIRED', { dialect });
    }
    if (!isSupportedDialect(dialect)) {
      throw AppError.badRequest('UNSUPPORTED_DIALECT', { dialect });
    }

    /* ── Plan limits enforcement ────────────────────────────────── */
    const plan = await this.getUserPlan(userId);
    const limits = getPlanLimits(plan);

    /* Query length limit → 403 */
    if (sql.length > limits.maxQueryLength) {
      throw AppError.forbidden('QUERY_LENGTH_EXCEEDED', {
        max: limits.maxQueryLength,
        current: sql.length,
        plan,
      });
    }

    /* Execution rate limit → 429 */
    if (!executionRateLimiter.check(userId, limits.maxExecutionsPerMinute)) {
      const retryAfter = executionRateLimiter.getRetryAfter(userId);
      throw new AppError('RATE_LIMIT_EXCEEDED', 'RATE_LIMIT_EXCEEDED', 429, {
        maxPerMinute: limits.maxExecutionsPerMinute,
        retryAfter,
        plan,
      });
    }

    /* ── Heuristic query guard → 422 ───────────────────────────── */
    const guard = guardQuery(sql);
    if (guard.blocked) {
      logger.warn('query_guard.blocked', {
        userId,
        dialect,
        queryHash: hashQuery(sql),
        reason: guard.reason,
      });
      throw AppError.unprocessable('QUERY_TOO_EXPENSIVE', { reason: guard.reason });
    }

    /* Record rate hit before executing (prevents bursts during execution) */
    executionRateLimiter.record(userId);

    /*
     * sandboxService.execute never throws for SQL runtime errors —
     * those come back as status:'error' in the result.
     * Only true infrastructure failures (Docker unavailable, etc.)
     * produce exceptions, which the global error handler maps to 500.
     *
     * Pass the per-plan timeout to the sandbox.
     */
    const result = await sandboxService.execute(sql, dialect, limits.maxExecutionTimeMs);

    /* ── Audit + Telemetry + History (best-effort, non-blocking) ─────── */
    recordAudit({
      userId,
      dialect,
      status: result.status,
      executionTimeMs: result.executionTimeMs,
      sql,
    }).catch(() => {});

    recordTelemetry({
      userId,
      eventType: 'EXECUTION',
      dialect,
      executionTimeMs: result.executionTimeMs,
      success: result.success,
      sql,
    }).catch(() => {});

    this.recordExecution(userId, projectId, sql, dialect, result, accessToken).catch((err) => {
      logger.error('execution.history_failed', { reason: err instanceof Error ? err.message : String(err) });
    });

    logger.info('execution.completed', {
      userId,
      dialect,
      status: result.status === 'success' ? 200 : result.status === 'timeout' ? 200 : 200,
      executionTimeMs: result.executionTimeMs,
      queryHash: hashQuery(sql),
    });

    return result;
  }

  /** Get execution history for a project */
  async getHistory(
    _userId: string,
    projectId: string,
    accessToken: string,
    limit = 50,
  ): Promise<ExecutionHistoryEntry[]> {
    const client = createUserClient(accessToken);
    const { data, error } = await client
      .from('bubble_execution_history')
      .select('*')
      .eq('project_id', projectId)
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error) throw AppError.internal('INTERNAL_ERROR', { reason: error.message });
    return (data ?? []).map(mapHistoryRow);
  }

  private async recordExecution(
    userId: string,
    projectId: string,
    sql: string,
    dialect: string,
    result: ExecutionResult,
    accessToken: string,
  ): Promise<void> {
    const client = createUserClient(accessToken);

    const summaryParts: string[] = [];
    if (result.success && result.rowCount != null) {
      summaryParts.push(`${result.rowCount} rows`);
    }
    summaryParts.push(`${result.executionTimeMs}ms`);

    const { error } = await client.from('bubble_execution_history').insert({
      project_id: projectId,
      user_id: userId,
      sql,
      dialect,
      status: result.status,
      result_summary: summaryParts.join(', ') || null,
      error: result.error?.message ?? null,
      execution_time_ms: result.executionTimeMs ?? null,
    });

    if (error) {
      /* Non-critical — log but don't fail the execution */
      logger.error('execution.record_failed', { reason: error.message });
    }
  }

  private async getUserPlan(userId: string): Promise<string> {
    const { data, error } = await supabaseAdmin
      .from('bubble_profiles')
      .select('plan')
      .eq('id', userId)
      .single();

    if (error || !data) return 'free';
    return (data as { plan: string }).plan ?? 'free';
  }
}

function mapHistoryRow(row: Record<string, unknown>): ExecutionHistoryEntry {
  return {
    id: row['id'] as string,
    projectId: row['project_id'] as string,
    sql: row['sql'] as string,
    dialect: row['dialect'] as string,
    status: row['status'] as ExecutionHistoryEntry['status'],
    resultSummary: (row['result_summary'] as string) ?? null,
    error: (row['error'] as string) ?? null,
    executionTimeMs: (row['execution_time_ms'] as number) ?? null,
    createdAt: row['created_at'] as string,
  };
}

export const executionService = new ExecutionService();
