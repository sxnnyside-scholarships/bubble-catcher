import type { SupportedDialect } from './dialect';

export type ExecutionStatus = 'success' | 'error' | 'timeout' | 'killed';

export interface ExecutionError {
  message: string;
  code?: string;
}

/**
 * Normalized execution result from a sandbox query run.
 */
export interface ExecutionResult {
  success: boolean;
  status: ExecutionStatus;
  columns?: string[];
  rows?: unknown[][];
  rowCount?: number;
  executionTimeMs: number;
  error?: ExecutionError;
  /** Container identifier for execution tracking. */
  containerId?: string;
  executedAt: string;
}

export interface ExecuteQueryPayload {
  sql: string;
  dialect: SupportedDialect;
  projectId: string;
}

export interface ExecutionHistoryEntry {
  id: string;
  projectId: string;
  sql: string;
  dialect: SupportedDialect;
  status: ExecutionStatus;
  resultSummary: string | null;
  error: string | null;
  executionTimeMs: number | null;
  createdAt: string;
}

export interface ExplainNode {
  id: string;
  nodeType: string;
  relationName?: string;
  indexName?: string;
  cost: number;
  totalCost: number;
  actualTimeMs: number;
  actualTotalTimeMs: number;
  actualRows: number;
  planRows: number;
  loops: number;
  buffersHit?: number;
  buffersRead?: number;
  costPercent: number;
  filter?: string;
  condition?: string;
  children: ExplainNode[];
  raw?: Record<string, unknown>;
}

export interface ExplainPlanResult {
  root: ExplainNode;
  planningTimeMs?: number;
  executionTimeMs: number;
  totalCost: number;
  bottleneckNodeId?: string;
  rawOutput: string;
}

