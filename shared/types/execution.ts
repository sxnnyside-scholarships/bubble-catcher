export type ExecutionStatus = 'success' | 'error' | 'timeout' | 'killed';

export interface ExecutionColumn {
  name: string;
  type: string;
}

export interface ExecutionResultData {
  columns: ExecutionColumn[];
  rows: Record<string, unknown>[];
  rowCount: number;
  executionTimeMs: number;
}

export interface ExecutionResult {
  status: ExecutionStatus;
  data: ExecutionResultData | null;
  error: string | null;
  containerId: string;
  executedAt: string;
}

export interface ExecuteQueryPayload {
  sql: string;
  dialect: string;
  projectId: string;
}

export interface ExecutionHistoryEntry {
  id: string;
  projectId: string;
  sql: string;
  dialect: string;
  status: ExecutionStatus;
  resultSummary: string | null;
  error: string | null;
  executionTimeMs: number | null;
  createdAt: string;
}
