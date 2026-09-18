/**
 * Manages the long-lived, admin-started containers for server-based dialects (Postgres/MySQL/
 * MariaDB/MSSQL). Persisted in `sandbox_engines` (one row per dialect) so the running state survives
 * a backend restart in spirit — `getContainerId` self-heals to `stopped` if the container it remembers
 * is actually dead, rather than trusting the DB row blindly.
 */
import type { EngineState, ServerBasedDialect } from '@shared/types';
import { SERVER_BASED_DIALECTS } from '@shared/types';
import { eq } from 'drizzle-orm';
import { config } from '../config';
import { db } from '../db/client';
import { sandboxEnginesTable } from '../db/schema';
import { logger } from '../lib/logger';
import type { SandboxExecutor } from './executor.interface';

async function getRow(dialect: ServerBasedDialect) {
  const [row] = await db.select().from(sandboxEnginesTable).where(eq(sandboxEnginesTable.dialect, dialect));
  return row ?? null;
}

function toEngineState(
  dialect: ServerBasedDialect,
  row: { status: 'stopped' | 'running'; startedAt: Date | null } | null,
): EngineState {
  return {
    dialect,
    status: row?.status ?? 'stopped',
    startedAt: row?.startedAt?.toISOString() ?? null,
  };
}

/** Returns the running container id for a dialect, or null if it's stopped — self-healing the DB
 * record to `stopped` if the container we remember has actually died. */
export async function getContainerId(dialect: ServerBasedDialect, executor: SandboxExecutor): Promise<string | null> {
  const row = await getRow(dialect);
  if (row?.status !== 'running' || !row.containerId) return null;

  const alive = (await executor.isContainerAlive?.(row.containerId)) ?? false;
  if (!alive) {
    logger.warn('sandbox.engine_died', { dialect, containerId: row.containerId });
    await db
      .update(sandboxEnginesTable)
      .set({ status: 'stopped', containerId: null, startedAt: null })
      .where(eq(sandboxEnginesTable.dialect, dialect));
    return null;
  }

  return row.containerId;
}

/** Idempotent — starting an already-running engine just returns its current state. */
export async function startEngine(dialect: ServerBasedDialect, executor: SandboxExecutor): Promise<EngineState> {
  const existingContainerId = await getContainerId(dialect, executor);
  if (existingContainerId) {
    const row = await getRow(dialect);
    return toEngineState(dialect, { status: 'running', startedAt: row?.startedAt ?? null });
  }

  const { containerId } = await executor.startPersistent!(config.sandboxPersistentMemoryLimit);
  const startedAt = new Date();

  await db
    .insert(sandboxEnginesTable)
    .values({ dialect, containerId, status: 'running', startedAt })
    .onConflictDoUpdate({ target: sandboxEnginesTable.dialect, set: { containerId, status: 'running', startedAt } });

  logger.info('sandbox.engine_started', { dialect, containerId });
  return toEngineState(dialect, { status: 'running', startedAt });
}

/** Idempotent — stopping an already-stopped engine is a no-op. */
export async function stopEngine(dialect: ServerBasedDialect, executor: SandboxExecutor): Promise<EngineState> {
  const row = await getRow(dialect);
  if (row?.containerId) {
    await executor.stopPersistent?.(row.containerId);
    logger.info('sandbox.engine_stopped', { dialect, containerId: row.containerId });
  }

  await db
    .insert(sandboxEnginesTable)
    .values({ dialect, containerId: null, status: 'stopped', startedAt: null })
    .onConflictDoUpdate({
      target: sandboxEnginesTable.dialect,
      set: { containerId: null, status: 'stopped', startedAt: null },
    });

  return toEngineState(dialect, { status: 'stopped', startedAt: null });
}

export async function getAllEngineStates(executors: Map<ServerBasedDialect, SandboxExecutor>): Promise<EngineState[]> {
  const states: EngineState[] = [];
  for (const dialect of SERVER_BASED_DIALECTS) {
    const executor = executors.get(dialect);
    if (!executor) continue;
    const containerId = await getContainerId(dialect, executor);
    const row = await getRow(dialect);
    states.push(toEngineState(dialect, containerId ? { status: 'running', startedAt: row?.startedAt ?? null } : null));
  }
  return states;
}
