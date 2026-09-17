import type { ExecutionHistoryEntry } from '@shared/types';
import type { executionHistoryTable } from '../db/schema';

type ExecutionHistoryRow = typeof executionHistoryTable.$inferSelect;

export function toExecutionHistoryDto(row: ExecutionHistoryRow): ExecutionHistoryEntry {
  return {
    id: row.id,
    projectId: row.projectId,
    sql: row.sql,
    dialect: row.dialect,
    status: row.status,
    resultSummary: row.resultSummary,
    error: row.error,
    executionTimeMs: row.executionTimeMs,
    createdAt: row.createdAt.toISOString(),
  };
}
