export type ExecutionStatus = 'success' | 'error' | 'timeout' | 'killed';

export interface ExecutionError {
  message: string;
  code?: string;
}

/**
 * Normalized execution response.
 * This is the contract returned to the frontend — never raw CLI output.
 */
export interface ExecutionResult {
  success: boolean;
  status: ExecutionStatus;
  columns?: string[];
  rows?: unknown[][];
  rowCount?: number;
  executionTimeMs: number;
  error?: ExecutionError;
  /** Internal — not relied upon by frontend */
  containerId?: string;
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
