import type { ServerBasedDialect } from './dialect';

export type EngineStatus = 'stopped' | 'running' | 'starting';

export interface EngineState {
  dialect: ServerBasedDialect;
  status: EngineStatus;
  startedAt: string | null;
}

/** Response of `GET /admin/sandbox/engines` */
export interface EngineStatesResponse {
  engines: EngineState[];
}
