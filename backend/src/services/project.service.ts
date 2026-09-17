import type {
  CreateProjectPayload,
  CreateSavedQueryPayload,
  PaginatedResponse,
  Project,
  SavedQuery,
  UpdateProjectPayload,
  UpdateSavedQueryPayload,
} from '@shared/types';
import { isSupportedDialect } from '@shared/types';
import { and, count, desc, eq } from 'drizzle-orm';
import { config } from '../config';
import { db } from '../db/client';
import { projectsTable, savedQueriesTable } from '../db/schema';
import { notDeleted, softDeleteNow } from '../db/soft-delete';
import { toProjectDto, toSavedQueryDto } from '../dto/project.dto';
import { AppError } from '../lib/errors';
import { type PaginationParams, parsePagination, toPaginatedResponse } from '../lib/pagination';
import { sandboxService } from '../sandbox/service';

export class ProjectService {
  async listProjects(
    userId: string,
    pagination: PaginationParams = parsePagination({}),
  ): Promise<PaginatedResponse<Project>> {
    const [rows, [{ value: total }]] = await Promise.all([
      db
        .select()
        .from(projectsTable)
        .where(and(eq(projectsTable.userId, userId), notDeleted(projectsTable.deletedAt)))
        .orderBy(desc(projectsTable.createdAt))
        .limit(pagination.pageSize)
        .offset(pagination.offset),
      db
        .select({ value: count() })
        .from(projectsTable)
        .where(and(eq(projectsTable.userId, userId), notDeleted(projectsTable.deletedAt))),
    ]);

    return toPaginatedResponse(rows.map(toProjectDto), total, pagination);
  }

  async getProject(userId: string, projectId: string): Promise<Project> {
    const [row] = await db
      .select()
      .from(projectsTable)
      .where(
        and(eq(projectsTable.id, projectId), eq(projectsTable.userId, userId), notDeleted(projectsTable.deletedAt)),
      );

    if (!row) throw AppError.notFound('NOT_FOUND');
    return toProjectDto(row);
  }

  async createProject(userId: string, payload: CreateProjectPayload): Promise<Project> {
    if (!isSupportedDialect(payload.dialect)) {
      throw AppError.badRequest('UNSUPPORTED_DIALECT', { dialect: payload.dialect });
    }

    const projectCount = await this.getProjectCount(userId);
    if (projectCount >= config.maxProjectsPerUser) {
      throw AppError.limitReached('PROJECT_LIMIT', { max: config.maxProjectsPerUser });
    }

    /* One project per user per dialect (a "schema") — also enforced by a partial unique index as a safety net. */
    const [existing] = await db
      .select({ id: projectsTable.id })
      .from(projectsTable)
      .where(
        and(
          eq(projectsTable.userId, userId),
          eq(projectsTable.dialect, payload.dialect),
          notDeleted(projectsTable.deletedAt),
        ),
      );
    if (existing) {
      throw AppError.conflict('PROJECT_DIALECT_EXISTS', { dialect: payload.dialect });
    }

    const [row] = await db
      .insert(projectsTable)
      .values({
        userId,
        title: payload.title,
        description: payload.description,
        dialect: payload.dialect,
      })
      .returning();

    if (!row) throw AppError.internal('INTERNAL_ERROR');
    return toProjectDto(row);
  }

  async updateProject(userId: string, projectId: string, payload: UpdateProjectPayload): Promise<Project> {
    if (payload.dialect && !isSupportedDialect(payload.dialect)) {
      throw AppError.badRequest('UNSUPPORTED_DIALECT', { dialect: payload.dialect });
    }

    if (payload.dialect) {
      const [existing] = await db
        .select({ id: projectsTable.id })
        .from(projectsTable)
        .where(
          and(
            eq(projectsTable.userId, userId),
            eq(projectsTable.dialect, payload.dialect),
            notDeleted(projectsTable.deletedAt),
          ),
        );
      if (existing && existing.id !== projectId) {
        throw AppError.conflict('PROJECT_DIALECT_EXISTS', { dialect: payload.dialect });
      }
    }

    const updateData: Partial<typeof projectsTable.$inferInsert> = {};
    if (payload.title !== undefined) updateData.title = payload.title;
    if (payload.description !== undefined) updateData.description = payload.description;
    if (payload.dialect !== undefined) updateData.dialect = payload.dialect;

    const [row] = await db
      .update(projectsTable)
      .set(updateData)
      .where(
        and(eq(projectsTable.id, projectId), eq(projectsTable.userId, userId), notDeleted(projectsTable.deletedAt)),
      )
      .returning();

    if (!row) throw AppError.notFound('NOT_FOUND');
    return toProjectDto(row);
  }

  /** Soft delete — never hard-deletes a project row */
  async deleteProject(userId: string, projectId: string): Promise<void> {
    const [row] = await db
      .update(projectsTable)
      .set({ deletedAt: softDeleteNow() })
      .where(
        and(eq(projectsTable.id, projectId), eq(projectsTable.userId, userId), notDeleted(projectsTable.deletedAt)),
      )
      .returning({ id: projectsTable.id, dialect: projectsTable.dialect });

    if (!row) throw AppError.notFound('NOT_FOUND');

    /* Best-effort: drop isolated project database from persistent engine if running */
    sandboxService.dropProjectDatabase(row.dialect, projectId).catch((err) => {
      console.warn(`[ProjectService] Could not drop sandbox DB for ${projectId} (${row.dialect}):`, err);
    });
  }

  async listQueries(userId: string, projectId: string): Promise<SavedQuery[]> {
    await this.getProject(userId, projectId);

    const rows = await db
      .select()
      .from(savedQueriesTable)
      .where(and(eq(savedQueriesTable.projectId, projectId), notDeleted(savedQueriesTable.deletedAt)))
      .orderBy(desc(savedQueriesTable.createdAt));
    return rows.map(toSavedQueryDto);
  }

  async recentQueries(userId: string, projectId: string, limit = 5): Promise<SavedQuery[]> {
    await this.getProject(userId, projectId);

    const rows = await db
      .select()
      .from(savedQueriesTable)
      .where(and(eq(savedQueriesTable.projectId, projectId), notDeleted(savedQueriesTable.deletedAt)))
      .orderBy(desc(savedQueriesTable.updatedAt))
      .limit(limit);
    return rows.map(toSavedQueryDto);
  }

  async createQuery(userId: string, payload: CreateSavedQueryPayload): Promise<SavedQuery> {
    await this.getProject(userId, payload.projectId);

    const [row] = await db
      .insert(savedQueriesTable)
      .values({
        projectId: payload.projectId,
        title: payload.title,
        sql: payload.sql,
      })
      .returning();

    if (!row) throw AppError.internal('INTERNAL_ERROR');
    return toSavedQueryDto(row);
  }

  async updateQuery(
    userId: string,
    projectId: string,
    queryId: string,
    payload: UpdateSavedQueryPayload,
  ): Promise<SavedQuery> {
    await this.getProject(userId, projectId);

    const updateData: Partial<typeof savedQueriesTable.$inferInsert> = {};
    if (payload.title !== undefined) updateData.title = payload.title;
    if (payload.sql !== undefined) updateData.sql = payload.sql;

    const [row] = await db
      .update(savedQueriesTable)
      .set(updateData)
      .where(
        and(
          eq(savedQueriesTable.id, queryId),
          eq(savedQueriesTable.projectId, projectId),
          notDeleted(savedQueriesTable.deletedAt),
        ),
      )
      .returning();

    if (!row) throw AppError.notFound('NOT_FOUND');
    return toSavedQueryDto(row);
  }

  /** Soft delete — never hard-deletes a saved query row */
  async deleteQuery(userId: string, projectId: string, queryId: string): Promise<void> {
    await this.getProject(userId, projectId);

    const [row] = await db
      .update(savedQueriesTable)
      .set({ deletedAt: softDeleteNow() })
      .where(
        and(
          eq(savedQueriesTable.id, queryId),
          eq(savedQueriesTable.projectId, projectId),
          notDeleted(savedQueriesTable.deletedAt),
        ),
      )
      .returning({ id: savedQueriesTable.id });

    if (!row) throw AppError.notFound('NOT_FOUND');
  }

  private async getProjectCount(userId: string): Promise<number> {
    const [row] = await db
      .select({ value: count() })
      .from(projectsTable)
      .where(and(eq(projectsTable.userId, userId), notDeleted(projectsTable.deletedAt)));
    return row?.value ?? 0;
  }
}

export const projectService = new ProjectService();
