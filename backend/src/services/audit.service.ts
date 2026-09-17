/**
 * Execution audit service — records every execution attempt for security audit.
 *
 * Writes to bubble_execution_audit (append-only, no soft delete needed).
 * Never stores raw SQL — only SHA-256 hash. Non-blocking: failures are
 * logged but never propagated to the caller.
 */

import type { SupportedDialect } from '@shared/types';
import { db } from '../db/client';
import { executionAuditTable } from '../db/schema';
import { hashQuery, logger } from '../lib/logger';

export interface AuditEntry {
  userId: string;
  dialect: SupportedDialect;
  status: 'success' | 'error' | 'timeout' | 'killed';
  executionTimeMs: number;
  sql: string;
}

/** Record an execution attempt in the audit table. Call-and-forget — does not throw. */
export async function recordAudit(entry: AuditEntry): Promise<void> {
  try {
    await db.insert(executionAuditTable).values({
      userId: entry.userId,
      dialect: entry.dialect,
      status: entry.status,
      executionTimeMs: entry.executionTimeMs,
      queryHash: hashQuery(entry.sql),
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    logger.error('audit.insert_exception', { reason: message });
  }
}
