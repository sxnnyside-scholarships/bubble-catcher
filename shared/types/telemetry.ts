/** Aggregate telemetry summary metrics. */
export interface TelemetrySummary {
  totalAnalysis: number;
  totalExecution: number;
  avgExecutionTime: number;
  dialectUsage: Record<string, number>;
  successRate: number;
}

/** Execution health indicators for workspace analytics. */
export interface ExecutionHealth {
  successfulPct: number;
  failedPct: number;
  dangerousPct: number;
  improvablePct: number;
  totalRuns: number;
}

export interface ExecutionTrendPoint {
  date: string;
  count: number;
}

/** Workspace analytics summary payload. */
export interface WorkspaceSummary {
  health: ExecutionHealth;
  trend: ExecutionTrendPoint[];
}
