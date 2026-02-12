/**
 * Execution audit service — records every execution attempt for security audit.
 *
 * Writes to bubble_execution_audit table via service role (bypasses RLS).
 * Never stores raw SQL — only SHA-256 hash.
 * Non-blocking: failures are logged but never propagated to the caller.
 */
import { supabaseAdmin } from '../lib/supabase';
import { hashQuery, logger } from '../lib/logger';

export interface AuditEntry {
  userId: string;
  dialect: string;
  status: string;
  executionTimeMs: number;
  sql: string;
}

/**
 * Record an execution attempt in the audit table.
 * Call-and-forget — does not throw.
 */
export async function recordAudit(entry: AuditEntry): Promise<void> {
  try {
    const { error } = await supabaseAdmin.from('bubble_execution_audit').insert({
      user_id: entry.userId,
      dialect: entry.dialect,
      status: entry.status,
      execution_time_ms: entry.executionTimeMs,
      query_hash: hashQuery(entry.sql),
    });

    if (error) {
      logger.error('audit.insert_failed', { reason: error.message });
    }
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    logger.error('audit.insert_exception', { reason: message });
  }
}
