/** Mirrors telemetry.service.ts's `TelemetrySummary` — response of `GET /telemetry/summary`. */
export interface TelemetrySummary {
  totalAnalysis: number;
  totalExecution: number;
  avgExecutionTime: number;
  dialectUsage: Record<string, number>;
  successRate: number;
}

/** Mirrors telemetry.service.ts's `ExecutionHealth` — the Workspace KPI cards. */
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

/** Response of `GET /telemetry/workspace` */
export interface WorkspaceSummary {
  health: ExecutionHealth;
  trend: ExecutionTrendPoint[];
}
