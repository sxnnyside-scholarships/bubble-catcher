import type { CreateTablePayload, ProjectSchema, SeedTableResult, TableSchema } from '@shared/types';
import { isServerBasedDialect } from '@shared/types';
import { and, eq } from 'drizzle-orm';
import { db } from '../db/client';
import { projectsTable, type SchemaStatement } from '../db/schema';
import { notDeleted } from '../db/soft-delete';
import { AppError } from '../lib/errors';
import { generateFakeRows } from '../lib/fake-data';
import { buildCreateTableSql, buildDropTableSql, buildInsertStatements, validateIdentifier } from '../lib/schema-ddl';
import { sandboxService } from '../sandbox';

const MAX_SEED_ROWS = 5000;
/** Schema/seed operations are validated against the sandbox before being persisted — give them more
 * room than a normal query, scaling with row count for large seeds. */
const SCHEMA_OP_TIMEOUT_MS = 30_000;

async function getOwnedProject(userId: string, projectId: string) {
  const [row] = await db
    .select()
    .from(projectsTable)
    .where(and(eq(projectsTable.id, projectId), eq(projectsTable.userId, userId), notDeleted(projectsTable.deletedAt)));

  if (!row) throw AppError.notFound('NOT_FOUND');
  return row;
}

function seedSqlFor(statements: SchemaStatement[]): string {
  return statements.map((s) => s.sql).join('\n');
}

/**
 * Runs `sql` against a project's sandbox. Server-based dialects (postgres/mysql/mariadb/mssql) hit
 * the project's own persistent database directly — no replay needed, the database itself is the
 * state. Non-server dialects (sqlite/libsql) still boot a fresh engine per call, so the project's
 * existing statements are replayed first to reconstruct prior state before `sql` runs.
 */
async function runSchemaOp(
  dialect: string,
  sql: string,
  existingStatements: SchemaStatement[],
  projectId: string,
  timeoutMs: number,
) {
  if (isServerBasedDialect(dialect)) {
    return sandboxService.execute(sql, dialect, timeoutMs, { projectId });
  }
  return sandboxService.execute(sql, dialect, timeoutMs, { seedSql: seedSqlFor(existingStatements) });
}

function assertSchemaOpSuccess(result: { success: boolean; error?: { message: string; code?: string } }) {
  if (result.success) return;
  if (result.error?.code === 'SANDBOX_OFFLINE') {
    throw AppError.badRequest('SANDBOX_OFFLINE', { reason: result.error.message });
  }
  throw AppError.unprocessable('SCHEMA_OPERATION_FAILED', { reason: result.error?.message });
}

export class SchemaService {
  async getSchema(userId: string, projectId: string): Promise<ProjectSchema> {
    const project = await getOwnedProject(userId, projectId);
    return { tables: project.schemaTables };
  }

  async createTable(userId: string, projectId: string, payload: CreateTablePayload): Promise<ProjectSchema> {
    const project = await getOwnedProject(userId, projectId);

    if (project.schemaTables.some((t) => t.name === payload.name)) {
      throw AppError.conflict('TABLE_ALREADY_EXISTS', { name: payload.name });
    }

    const table: TableSchema = { name: payload.name, columns: payload.columns };
    const createSql = buildCreateTableSql(project.dialect, table);

    const result = await runSchemaOp(
      project.dialect,
      createSql,
      project.schemaStatements,
      projectId,
      SCHEMA_OP_TIMEOUT_MS,
    );
    assertSchemaOpSuccess(result);

    /* Kept for non-server replay AND as an audit trail for server-based dialects, even though the
     * latter no longer need it to reconstruct state. */
    const newStatement: SchemaStatement = { tableName: payload.name, kind: 'create', sql: createSql };
    const schemaStatements = [...project.schemaStatements, newStatement];
    const schemaTables = [...project.schemaTables, table];

    await db.update(projectsTable).set({ schemaStatements, schemaTables }).where(eq(projectsTable.id, projectId));

    return { tables: schemaTables };
  }

  async dropTable(userId: string, projectId: string, tableName: string): Promise<ProjectSchema> {
    const project = await getOwnedProject(userId, projectId);

    if (!project.schemaTables.some((t) => t.name === tableName)) {
      throw AppError.notFound('NOT_FOUND');
    }

    /* Server-based dialects have a real, persistent database — dropping the table for real (not just
     * forgetting about it) keeps that database in sync with what the UI shows. Non-server dialects
     * don't need this: the table simply won't be recreated next time we replay the (now-shorter)
     * statement list. */
    if (isServerBasedDialect(project.dialect)) {
      const dropSql = buildDropTableSql(project.dialect, tableName);
      const result = await sandboxService.execute(dropSql, project.dialect, SCHEMA_OP_TIMEOUT_MS, { projectId });
      assertSchemaOpSuccess(result);
    }

    const schemaStatements = project.schemaStatements.filter((s) => s.tableName !== tableName);
    const schemaTables = project.schemaTables.filter((t) => t.name !== tableName);

    await db.update(projectsTable).set({ schemaStatements, schemaTables }).where(eq(projectsTable.id, projectId));

    return { tables: schemaTables };
  }

  async seedTable(userId: string, projectId: string, tableName: string, count: number): Promise<SeedTableResult> {
    const project = await getOwnedProject(userId, projectId);

    const table = project.schemaTables.find((t) => t.name === tableName);
    if (!table) throw AppError.notFound('NOT_FOUND');

    const rowCount = Math.min(Math.max(1, Math.trunc(count)), MAX_SEED_ROWS);
    const rows = generateFakeRows(table.columns, rowCount);
    const insertStatements = buildInsertStatements(project.dialect, table, rows);
    const combinedInsertSql = insertStatements.join('\n');

    const timeoutMs = Math.min(120_000, Math.max(SCHEMA_OP_TIMEOUT_MS, rowCount * 15));
    const result = await runSchemaOp(
      project.dialect,
      combinedInsertSql,
      project.schemaStatements,
      projectId,
      timeoutMs,
    );
    assertSchemaOpSuccess(result);

    const newStatements: SchemaStatement[] = insertStatements.map((sql) => ({ tableName, kind: 'seed', sql }));
    const schemaStatements = [...project.schemaStatements, ...newStatements];

    await db.update(projectsTable).set({ schemaStatements }).where(eq(projectsTable.id, projectId));

    return { inserted: rowCount };
  }
}

export const schemaService = new SchemaService();

export { seedSqlFor, validateIdentifier };
