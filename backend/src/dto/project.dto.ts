import type { Project, SavedQuery } from '@shared/types';
import type { projectsTable, savedQueriesTable } from '../db/schema';

type ProjectRow = typeof projectsTable.$inferSelect;
type SavedQueryRow = typeof savedQueriesTable.$inferSelect;

export function toProjectDto(row: ProjectRow): Project {
  return {
    id: row.id,
    userId: row.userId,
    title: row.title,
    description: row.description,
    dialect: row.dialect,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

export function toSavedQueryDto(row: SavedQueryRow): SavedQuery {
  return {
    id: row.id,
    projectId: row.projectId,
    title: row.title,
    sql: row.sql,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}
