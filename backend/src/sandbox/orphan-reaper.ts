import { eq } from 'drizzle-orm';
import { db } from '../db/client';
import { sandboxEnginesTable } from '../db/schema';
import { logger } from '../lib/logger';
import { docker } from './docker-executor';

/** Ephemeral containers running longer than this are considered stalled/orphaned. */
export const EPHEMERAL_MAX_AGE_MS = 120_000; // 2 minutes

/** Default sweep interval in background */
export const DEFAULT_SWEEP_INTERVAL_MS = 120_000; // 2 minutes

let sweepTimer: ReturnType<typeof setInterval> | null = null;

export interface ReaperSweepResult {
  ephemeralReaped: number;
  enginesReaped: number;
  errors: number;
}

/**
 * Sweeps orphaned, dead, or untracked containers labeled with `bubble-catcher.managed=true`.
 */
export async function sweepOrphans(): Promise<ReaperSweepResult> {
  const result: ReaperSweepResult = { ephemeralReaped: 0, enginesReaped: 0, errors: 0 };
  const now = Date.now();

  try {
    const containers = await docker.listContainers({
      all: true,
      filters: {
        label: ['bubble-catcher.managed=true'],
      },
    });

    if (containers.length === 0) return result;

    /* Fetch currently active running engine container IDs from DB for reconciliation */
    const activeEngines = await db
      .select({ containerId: sandboxEnginesTable.containerId })
      .from(sandboxEnginesTable)
      .where(eq(sandboxEnginesTable.status, 'running'))
      .catch(() => []);

    const activeContainerIds = new Set(
      activeEngines.map((e) => e.containerId).filter((id): id is string => Boolean(id)),
    );

    for (const info of containers) {
      const role = info.Labels['bubble-catcher.role'];
      const containerId = info.Id;
      const state = (info.State || '').toLowerCase();

      if (role === 'ephemeral-query') {
        const createdAt = Number(info.Labels['bubble-catcher.created-at']) || 0;
        const isDeadOrExited = state === 'exited' || state === 'dead';
        const isExpired = now - createdAt > EPHEMERAL_MAX_AGE_MS;

        if (isDeadOrExited || isExpired) {
          try {
            const container = docker.getContainer(containerId);
            await container.stop({ t: 1 }).catch(() => {});
            await container.remove({ force: true, v: true });
            result.ephemeralReaped++;
          } catch (err) {
            result.errors++;
            logger.warn('sandbox.reaper_ephemeral_fail', { containerId, error: String(err) });
          }
        }
      } else if (role === 'persistent-engine') {
        const startedAt = Number(info.Labels['bubble-catcher.started-at']) || 0;
        const isTracked = activeContainerIds.has(containerId);
        /* If an engine container is not tracked in DB and older than 5 minutes, it is an abandoned zombie */
        const isStaleUntracked = !isTracked && now - startedAt > 300_000;

        if (isStaleUntracked) {
          try {
            const container = docker.getContainer(containerId);
            await container.stop({ t: 2 }).catch(() => {});
            await container.remove({ force: true, v: false });
            result.enginesReaped++;
            logger.info('sandbox.reaper_engine_pruned', {
              containerId,
              dialect: info.Labels['bubble-catcher.dialect'],
            });
          } catch (err) {
            result.errors++;
            logger.warn('sandbox.reaper_engine_fail', { containerId, error: String(err) });
          }
        }
      }
    }

    if (result.ephemeralReaped > 0 || result.enginesReaped > 0) {
      logger.info('sandbox.reaper_sweep_completed', { ...result });
    }
  } catch (err) {
    logger.warn('sandbox.reaper_sweep_error', { error: String(err) });
  }

  return result;
}

/** Starts periodic reaper sweeps and runs an initial sweep */
export function startOrphanReaper(intervalMs = DEFAULT_SWEEP_INTERVAL_MS): void {
  if (sweepTimer) return;
  // Non-blocking initial sweep
  sweepOrphans().catch(() => {});
  sweepTimer = setInterval(() => {
    sweepOrphans().catch(() => {});
  }, intervalMs);
  logger.info('sandbox.reaper_started', { intervalMs });
}

/** Stops the background reaper timer */
export function stopOrphanReaper(): void {
  if (sweepTimer) {
    clearInterval(sweepTimer);
    sweepTimer = null;
    logger.info('sandbox.reaper_stopped');
  }
}
