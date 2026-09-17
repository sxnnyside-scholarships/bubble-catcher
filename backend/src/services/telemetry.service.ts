/**
 * Telemetry service — records ANALYSIS and EXECUTION events.
 *
 * Writes to bubble_telemetry (append-only). Never stores raw SQL — only
 * SHA-256 hash. Non-blocking: failures logged but never propagated.
 */

import type { Dialect, ExecutionHealth, ExecutionTrendPoint, TelemetrySummary } from '@shared/types';
import { and, eq, gte, sql as rawSql } from 'drizzle-orm';
import { db } from '../db/client';
import { executionHistoryTable, telemetryTable } from '../db/schema';
import { hashQuery, logger } from '../lib/logger';

export type TelemetryEventType = 'ANALYSIS' | 'EXECUTION';

interface TelemetryEvent {
  userId: string;
  eventType: TelemetryEventType;
  dialect: Dialect;
  executionTimeMs: number | null;
  success: boolean;
  sql: string;
}

/** Record a telemetry event. Fire-and-forget — never throws. */
export async function recordTelemetry(event: TelemetryEvent): Promise<void> {
  try {
    await db.insert(telemetryTable).values({
      userId: event.userId,
      eventType: event.eventType,
      dialect: event.dialect,
      executionTimeMs: event.executionTimeMs,
      success: event.success,
      queryHash: hashQuery(event.sql),
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    logger.error('telemetry.insert_exception', { reason: message });
  }
}

/**
 * Aggregate telemetry summary. Pass a `userId` to scope to one user
 * (used by telemetry.routes.ts); omit it for an instance-wide aggregate
 * (used by admin.routes.ts).
 */
export async function getTelemetrySummary(userId?: string): Promise<TelemetrySummary> {
  try {
    const rows = userId
      ? await db.select().from(telemetryTable).where(eq(telemetryTable.userId, userId))
      : await db.select().from(telemetryTable);

    let totalAnalysis = 0;
    let totalExecution = 0;
    let sumExecTime = 0;
    let execTimeCount = 0;
    let successCount = 0;
    const dialectUsage: Record<string, number> = {};

    for (const row of rows) {
      if (row.eventType === 'ANALYSIS') totalAnalysis++;
      if (row.eventType === 'EXECUTION') totalExecution++;

      if (row.executionTimeMs != null && row.eventType === 'EXECUTION') {
        sumExecTime += row.executionTimeMs;
        execTimeCount++;
      }

      if (row.success) successCount++;

      dialectUsage[row.dialect] = (dialectUsage[row.dialect] ?? 0) + 1;
    }

    const total = totalAnalysis + totalExecution;
    return {
      totalAnalysis,
      totalExecution,
      avgExecutionTime: execTimeCount > 0 ? Math.round(sumExecTime / execTimeCount) : 0,
      dialectUsage,
      successRate: total > 0 ? Math.round((successCount / total) * 100) : 0,
    };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    logger.error('telemetry.summary_failed', { reason: message, userId });
    return { totalAnalysis: 0, totalExecution: 0, avgExecutionTime: 0, dialectUsage: {}, successRate: 0 };
  }
}

/**
 * Percentages (0-100, rounded) mapped from `bubble_execution_history.status`:
 * successful←'success', failed←'error', dangerous←'killed' (sandbox killed the run
 * for resource abuse / unsafe operation), improvable←'timeout' (ran too long — a
 * signal the query needs optimization).
 */

/** Execution-outcome breakdown for the Workspace KPI cards — scoped to one user's `bubble_execution_history`. */
export async function getExecutionHealth(userId: string): Promise<ExecutionHealth> {
  try {
    const rows = await db
      .select({ status: executionHistoryTable.status, value: rawSql<number>`count(*)` })
      .from(executionHistoryTable)
      .where(eq(executionHistoryTable.userId, userId))
      .groupBy(executionHistoryTable.status);

    const counts: Record<string, number> = {};
    let total = 0;
    for (const row of rows) {
      counts[row.status] = Number(row.value);
      total += Number(row.value);
    }

    const pct = (n: number) => (total > 0 ? Math.round((n / total) * 100) : 0);

    return {
      successfulPct: pct(counts['success'] ?? 0),
      failedPct: pct(counts['error'] ?? 0),
      dangerousPct: pct(counts['killed'] ?? 0),
      improvablePct: pct(counts['timeout'] ?? 0),
      totalRuns: total,
    };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    logger.error('telemetry.execution_health_failed', { reason: message, userId });
    return { successfulPct: 0, failedPct: 0, dangerousPct: 0, improvablePct: 0, totalRuns: 0 };
  }
}

/** Daily execution counts for the last `days` days (including days with zero runs) — powers the Workspace usage-over-time chart. */
export async function getExecutionTrend(userId: string, days = 7): Promise<ExecutionTrendPoint[]> {
  try {
    const since = new Date();
    since.setUTCHours(0, 0, 0, 0);
    since.setUTCDate(since.getUTCDate() - (days - 1));

    const rows = await db
      .select({
        date: rawSql<string>`to_char(${executionHistoryTable.createdAt}, 'YYYY-MM-DD')`,
        value: rawSql<number>`count(*)`,
      })
      .from(executionHistoryTable)
      .where(and(eq(executionHistoryTable.userId, userId), gte(executionHistoryTable.createdAt, since)))
      .groupBy(rawSql`to_char(${executionHistoryTable.createdAt}, 'YYYY-MM-DD')`);

    const byDate = new Map(rows.map((row) => [row.date, Number(row.value)]));

    const points: ExecutionTrendPoint[] = [];
    for (let i = 0; i < days; i++) {
      const day = new Date(since);
      day.setUTCDate(since.getUTCDate() + i);
      const key = day.toISOString().slice(0, 10);
      points.push({ date: key, count: byDate.get(key) ?? 0 });
    }

    return points;
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    logger.error('telemetry.execution_trend_failed', { reason: message, userId });
    return [];
  }
}
