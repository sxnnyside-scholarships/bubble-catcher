/**
 * Plan limit definitions for Bubble Catcher v1.0.0.
 *
 * These constants define hard limits per plan tier.
 * Do NOT import external services — these are pure config.
 */

export interface PlanLimits {
  /** Maximum number of projects */
  maxProjects: number;
  /** Maximum SQL query length in characters */
  maxQueryLength: number;
  /** Maximum execution timeout in milliseconds */
  maxExecutionTimeMs: number;
  /** Maximum executions per minute */
  maxExecutionsPerMinute: number;
  /** Maximum analysis requests per minute */
  maxAnalysisPerMinute: number;
}

const PLAN_LIMITS: Record<string, PlanLimits> = {
  free: {
    maxProjects: 3,
    maxQueryLength: 5_000,
    maxExecutionTimeMs: 5_000,
    maxExecutionsPerMinute: 20,
    maxAnalysisPerMinute: 60,
  },
  premium: {
    maxProjects: Infinity,
    maxQueryLength: 20_000,
    maxExecutionTimeMs: 15_000,
    maxExecutionsPerMinute: 100,
    maxAnalysisPerMinute: 60,
  },
  enterprise: {
    maxProjects: Infinity,
    maxQueryLength: 100_000,
    maxExecutionTimeMs: 60_000,
    maxExecutionsPerMinute: 200,
    maxAnalysisPerMinute: 120,
  },
};

/** Get plan limits for a given plan tier. Defaults to 'free'. */
export function getPlanLimits(plan: string): PlanLimits {
  return PLAN_LIMITS[plan] ?? PLAN_LIMITS['free'];
}
