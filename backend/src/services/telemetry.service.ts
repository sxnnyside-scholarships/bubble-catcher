/**
 * Telemetry service — records ANALYSIS and EXECUTION events.
 *
 * Writes to bubble_telemetry via service role (bypasses RLS).
 * Never stores raw SQL — only SHA-256 hash.
 * Non-blocking: failures logged but never propagated.
 */
import { supabaseAdmin } from '../lib/supabase';
import { hashQuery, logger } from '../lib/logger';

export type TelemetryEventType = 'ANALYSIS' | 'EXECUTION';

interface TelemetryEvent {
  userId: string;
  eventType: TelemetryEventType;
  dialect: string;
  executionTimeMs: number | null;
  success: boolean;
  sql: string;
}

/**
 * Record a telemetry event. Fire-and-forget — never throws.
 */
export async function recordTelemetry(event: TelemetryEvent): Promise<void> {
  try {
    const { error } = await supabaseAdmin.from('bubble_telemetry').insert({
      user_id: event.userId,
      event_type: event.eventType,
      dialect: event.dialect,
      execution_time_ms: event.executionTimeMs,
      success: event.success,
      query_hash: hashQuery(event.sql),
    });

    if (error) {
      logger.error('telemetry.insert_failed', { reason: error.message });
    }
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    logger.error('telemetry.insert_exception', { reason: message });
  }
}

export interface TelemetrySummary {
  totalAnalysis: number;
  totalExecution: number;
  avgExecutionTime: number;
  dialectUsage: Record<string, number>;
  successRate: number;
}

/**
 * Aggregate telemetry summary for a user.
 * Uses a single query for efficiency.
 */
export async function getTelemetrySummary(userId: string): Promise<TelemetrySummary> {
  const { data, error } = await supabaseAdmin
    .from('bubble_telemetry')
    .select('event_type, dialect, execution_time_ms, success')
    .eq('user_id', userId);

  if (error) {
    logger.error('telemetry.summary_failed', { reason: error.message, userId });
    return {
      totalAnalysis: 0,
      totalExecution: 0,
      avgExecutionTime: 0,
      dialectUsage: {},
      successRate: 0,
    };
  }

  const rows = data ?? [];

  let totalAnalysis = 0;
  let totalExecution = 0;
  let sumExecTime = 0;
  let execTimeCount = 0;
  let successCount = 0;
  const dialectUsage: Record<string, number> = {};

  for (const row of rows) {
    const eventType = row.event_type as string;
    const dialect = row.dialect as string;
    const execTime = row.execution_time_ms as number | null;
    const success = row.success as boolean;

    if (eventType === 'ANALYSIS') totalAnalysis++;
    if (eventType === 'EXECUTION') totalExecution++;

    if (execTime != null && eventType === 'EXECUTION') {
      sumExecTime += execTime;
      execTimeCount++;
    }

    if (success) successCount++;

    dialectUsage[dialect] = (dialectUsage[dialect] ?? 0) + 1;
  }

  const total = totalAnalysis + totalExecution;
  return {
    totalAnalysis,
    totalExecution,
    avgExecutionTime: execTimeCount > 0 ? Math.round(sumExecTime / execTimeCount) : 0,
    dialectUsage,
    successRate: total > 0 ? Math.round((successCount / total) * 100) : 0,
  };
}
