import type { CreatePlaygroundSharePayload, PlaygroundShare } from '@shared/types';
import { eq } from 'drizzle-orm';
import { db } from '../db/client';
import { playgroundSharesTable, projectsTable, usersTable } from '../db/schema';
import { AppError } from '../lib/errors';

export class PlaygroundShareService {
  async createShare(userId: string, payload: CreatePlaygroundSharePayload): Promise<PlaygroundShare> {
    if (!payload.title || !payload.title.trim()) {
      throw AppError.badRequest('VALIDATION_ERROR', { field: 'title', message: 'Title is required' });
    }
    if (!payload.sql || !payload.sql.trim()) {
      throw AppError.badRequest('EMPTY_QUERY');
    }

    let schemaStatements: any[] = [];
    let schemaTables: any[] = [];

    if (payload.projectId) {
      const [proj] = await db
        .select({
          schemaStatements: projectsTable.schemaStatements,
          schemaTables: projectsTable.schemaTables,
        })
        .from(projectsTable)
        .where(eq(projectsTable.id, payload.projectId));

      if (proj) {
        schemaStatements = proj.schemaStatements || [];
        schemaTables = proj.schemaTables || [];
      }
    }

    const [share] = await db
      .insert(playgroundSharesTable)
      .values({
        authorId: userId,
        title: payload.title.trim(),
        notes: payload.notes?.trim() || '',
        sql: payload.sql,
        dialect: payload.dialect,
        schemaStatements,
        schemaTables,
      })
      .returning();

    if (!share) {
      throw AppError.internal('INTERNAL_ERROR', { reason: 'Could not create playground share' });
    }

    const [user] = await db
      .select({ displayName: usersTable.displayName, email: usersTable.email })
      .from(usersTable)
      .where(eq(usersTable.id, userId));

    return {
      id: share.id,
      authorId: share.authorId,
      authorName: user?.displayName || user?.email || null,
      title: share.title,
      notes: share.notes,
      sql: share.sql,
      dialect: share.dialect,
      schemaStatements: share.schemaStatements,
      schemaTables: share.schemaTables,
      createdAt: share.createdAt.toISOString(),
    };
  }

  async getShare(shareId: string): Promise<PlaygroundShare> {
    const [row] = await db
      .select({
        share: playgroundSharesTable,
        authorName: usersTable.displayName,
        authorEmail: usersTable.email,
      })
      .from(playgroundSharesTable)
      .leftJoin(usersTable, eq(playgroundSharesTable.authorId, usersTable.id))
      .where(eq(playgroundSharesTable.id, shareId));

    if (!row) {
      throw AppError.notFound('NOT_FOUND');
    }

    return {
      id: row.share.id,
      authorId: row.share.authorId,
      authorName: row.authorName || row.authorEmail || null,
      title: row.share.title,
      notes: row.share.notes,
      sql: row.share.sql,
      dialect: row.share.dialect,
      schemaStatements: row.share.schemaStatements,
      schemaTables: row.share.schemaTables,
      createdAt: row.share.createdAt.toISOString(),
    };
  }
}

export const playgroundShareService = new PlaygroundShareService();
