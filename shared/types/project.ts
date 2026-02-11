import type { Dialect } from './dialect';

export interface Project {
  id: string;
  userId: string;
  title: string;
  description: string;
  dialect: Dialect;
  createdAt: string;
  updatedAt: string;
}

export interface CreateProjectPayload {
  title: string;
  description: string;
  dialect: Dialect;
}

export interface UpdateProjectPayload {
  title?: string;
  description?: string;
  dialect?: Dialect;
}

export interface SavedQuery {
  id: string;
  projectId: string;
  title: string;
  sql: string;
  createdAt: string;
  updatedAt: string;
}

export interface CreateSavedQueryPayload {
  projectId: string;
  title: string;
  sql: string;
}

export interface UpdateSavedQueryPayload {
  title?: string;
  sql?: string;
}

export const MAX_PROJECTS_FREE = 3;
