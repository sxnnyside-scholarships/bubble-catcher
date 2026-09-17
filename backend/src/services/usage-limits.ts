/**
 * Instance-wide usage limits for Bubble Catcher self-hosted.
 *
 * No plan tiers — a self-hosted instance has a single access level.
 * All values are operator-configurable via env (see config/env.ts) so a
 * self-hoster can tune limits for their VPS without touching code.
 */
import { config } from '../config';

export interface UsageLimits {
  maxProjects: number;
  maxQueryLength: number;
  maxExecutionTimeMs: number;
  maxExecutionsPerMinute: number;
  maxAnalysisPerMinute: number;
}

export function getUsageLimits(): UsageLimits {
  return {
    maxProjects: config.maxProjectsPerUser,
    maxQueryLength: config.maxQueryLength,
    maxExecutionTimeMs: config.sandboxTimeoutMs,
    maxExecutionsPerMinute: config.maxExecutionsPerMinute,
    maxAnalysisPerMinute: config.maxAnalysisPerMinute,
  };
}
