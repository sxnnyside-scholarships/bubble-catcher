import type { SupportedDialect } from './dialect';
import type { TableSchema } from './schema';

export interface Project {
  id: string;
  userId: string;
  title: string;
  description: string;
  dialect: SupportedDialect;
  createdAt: string;
  updatedAt: string;
}

export interface CreateProjectPayload {
  title: string;
  description: string;
  dialect: SupportedDialect;
}

export interface UpdateProjectPayload {
  title?: string;
  description?: string;
  dialect?: SupportedDialect;
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

export interface PlaygroundShare {
  id: string;
  authorId: string;
  authorName: string | null;
  title: string;
  notes: string;
  sql: string;
  dialect: SupportedDialect;
  schemaStatements: Array<{ tableName: string; kind: 'create' | 'seed'; sql: string }>;
  schemaTables: TableSchema[];
  createdAt: string;
}

export interface CreatePlaygroundSharePayload {
  title: string;
  notes?: string;
  sql: string;
  dialect: SupportedDialect;
  projectId?: string;
}

/** Default instance-wide project limit per user (overridable via MAX_PROJECTS_PER_USER env) */
export const DEFAULT_MAX_PROJECTS_PER_USER = 20;

