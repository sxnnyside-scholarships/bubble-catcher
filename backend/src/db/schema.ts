import type { PlatformFeatures, SmtpSettings, TableSchema } from '@shared/types';
import { sql } from 'drizzle-orm';
import {
  boolean,
  index,
  integer,
  jsonb,
  pgEnum,
  pgTable,
  real,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from 'drizzle-orm/pg-core';

/** One CREATE TABLE or one batch-INSERT — see `projectsTable.schemaStatements`. */
export interface SchemaStatement {
  tableName: string;
  kind: 'create' | 'seed';
  sql: string;
}

/** No Row Level Security — access control is enforced in the service layer (every query filters by userId; admin routes deliberately don't). */

export const userRoleEnum = pgEnum('user_role', ['admin', 'user']);
export const userStatusEnum = pgEnum('user_status', ['active', 'suspended', 'pending_approval']);
export const registrationModeEnum = pgEnum('registration_mode', ['open', 'invite_only', 'approval_required']);
export const dialectEnum = pgEnum('dialect', ['mysql', 'mariadb', 'postgresql', 'sqlite', 'libsql', 'mssql']);
export const serverDialectEnum = pgEnum('server_dialect', ['postgresql', 'mysql', 'mariadb', 'mssql']);
export const engineStatusEnum = pgEnum('engine_status', ['stopped', 'running']);
export const executionStatusEnum = pgEnum('execution_status', ['success', 'error', 'timeout', 'killed']);
export const telemetryEventEnum = pgEnum('telemetry_event', ['ANALYSIS', 'EXECUTION']);

/** Shape of `users.preferences`. Validate at the DTO layer, not the DB. */
export interface UserPreferences {
  theme: 'colorful' | 'light' | 'dark';
  locale: 'en' | 'es';
}

export const DEFAULT_USER_PREFERENCES: UserPreferences = {
  theme: 'colorful',
  locale: 'en',
};

const softDeleteColumn = {
  deletedAt: timestamp('deleted_at', { withTimezone: true }),
};

/** Replaces auth.users + bubble_profiles (fused). No `plan` column — no tiers. */
export const usersTable = pgTable('users', {
  id: uuid('id').primaryKey().defaultRandom(),
  email: text('email').notNull().unique(),
  passwordHash: text('password_hash').notNull(),
  /** Nullable only because accounts created before this column existed have none — every new signup sets it. */
  displayName: text('display_name'),
  role: userRoleEnum('role').notNull().default('user'),
  status: userStatusEnum('status').notNull().default('active'),
  /** True only for the first account created on this instance (see auth.routes.ts signup). Informational — role/status govern access, not this flag. */
  isOwner: boolean('is_owner').notNull().default(false),
  emailVerifiedAt: timestamp('email_verified_at', { withTimezone: true }),
  preferences: jsonb('preferences').$type<UserPreferences>().notNull().default(DEFAULT_USER_PREFERENCES),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  ...softDeleteColumn,
});

export const projectsTable = pgTable(
  'bubble_projects',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    userId: uuid('user_id')
      .notNull()
      .references(() => usersTable.id, { onDelete: 'cascade' }),
    title: text('title').notNull(),
    description: text('description').notNull().default(''),
    dialect: dialectEnum('dialect').notNull(),
    /**
     * Ordered DDL/seed statements (one per CREATE TABLE or generated batch of INSERTs) — sandbox
     * executions replay these before the user's query, so tables/rows created via the Sandbox persist
     * across runs despite each execution happening in a fresh, throwaway container. Kept as discrete
     * statements (not one blob) so dropping a table is a filter, not a SQL-parsing problem.
     */
    schemaStatements: jsonb('schema_statements').$type<SchemaStatement[]>().notNull().default([]),
    /** Structural mirror of the schema (table/column metadata) for the Sandbox diagram — maintained
     * directly from the Sandbox's own create/drop calls, never reverse-parsed from SQL. */
    schemaTables: jsonb('schema_tables').$type<TableSchema[]>().notNull().default([]),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
    ...softDeleteColumn,
  },
  (t) => [
    index('idx_bubble_projects_user_id').on(t.userId),
    /** One project per user per dialect — a schema is meant to be the user's single workspace for that engine. */
    uniqueIndex('uniq_bubble_projects_user_dialect').on(t.userId, t.dialect).where(sql`${t.deletedAt} IS NULL`),
  ],
);

export const savedQueriesTable = pgTable(
  'bubble_saved_queries',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    projectId: uuid('project_id')
      .notNull()
      .references(() => projectsTable.id, { onDelete: 'cascade' }),
    title: text('title').notNull(),
    sql: text('sql').notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
    ...softDeleteColumn,
  },
  (t) => [index('idx_bubble_saved_queries_project_id').on(t.projectId)],
);

/** Execution history is an append-only log — no soft delete needed, never updated in place. */
export const executionHistoryTable = pgTable(
  'bubble_execution_history',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    projectId: uuid('project_id')
      .notNull()
      .references(() => projectsTable.id, { onDelete: 'cascade' }),
    userId: uuid('user_id')
      .notNull()
      .references(() => usersTable.id, { onDelete: 'cascade' }),
    sql: text('sql').notNull(),
    dialect: dialectEnum('dialect').notNull(),
    status: executionStatusEnum('status').notNull(),
    resultSummary: text('result_summary'),
    error: text('error'),
    executionTimeMs: integer('execution_time_ms'),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    index('idx_bubble_execution_history_project_id').on(t.projectId),
    index('idx_bubble_execution_history_user_id').on(t.userId),
    index('idx_bubble_execution_history_created_at').on(t.createdAt),
  ],
);

/** Security audit log — append-only, never stores raw SQL, only a hash */
export const executionAuditTable = pgTable(
  'bubble_execution_audit',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    userId: uuid('user_id')
      .notNull()
      .references(() => usersTable.id, { onDelete: 'cascade' }),
    dialect: dialectEnum('dialect').notNull(),
    status: executionStatusEnum('status').notNull(),
    executionTimeMs: integer('execution_time_ms').notNull(),
    queryHash: text('query_hash').notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    index('idx_bubble_execution_audit_user_id').on(t.userId),
    index('idx_bubble_execution_audit_created_at').on(t.createdAt),
  ],
);

/** Append-only event log */
export const telemetryTable = pgTable(
  'bubble_telemetry',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    userId: uuid('user_id')
      .notNull()
      .references(() => usersTable.id, { onDelete: 'cascade' }),
    eventType: telemetryEventEnum('event_type').notNull(),
    dialect: dialectEnum('dialect').notNull(),
    executionTimeMs: integer('execution_time_ms'),
    success: boolean('success').notNull().default(true),
    queryHash: text('query_hash').notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index('idx_bubble_telemetry_user_id').on(t.userId)],
);

/** Only the SHA-256 hash is stored; rotated on every use (see auth.routes.ts `/auth/refresh`). */
export const refreshTokensTable = pgTable(
  'refresh_tokens',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    userId: uuid('user_id')
      .notNull()
      .references(() => usersTable.id, { onDelete: 'cascade' }),
    tokenHash: text('token_hash').notNull().unique(),
    expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
    revokedAt: timestamp('revoked_at', { withTimezone: true }),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index('idx_refresh_tokens_user_id').on(t.userId)],
);

/** Single-use, short-lived tokens for the forgot/reset password flow. */
export const passwordResetTokensTable = pgTable(
  'password_reset_tokens',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    userId: uuid('user_id')
      .notNull()
      .references(() => usersTable.id, { onDelete: 'cascade' }),
    tokenHash: text('token_hash').notNull().unique(),
    expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
    usedAt: timestamp('used_at', { withTimezone: true }),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index('idx_password_reset_tokens_user_id').on(t.userId)],
);

export const DEFAULT_PLATFORM_FEATURES: PlatformFeatures = {
  sandbox: true,
  playground: true,
  classroom: true,
  competition: true,
};

/** Singleton row (fixed id) holding instance-wide account governance and platform settings. */
export const systemSettingsTable = pgTable('system_settings', {
  id: text('id').primaryKey().default('singleton'),
  registrationMode: registrationModeEnum('registration_mode').notNull().default('open'),
  enabledFeatures: jsonb('enabled_features').$type<PlatformFeatures>().notNull().default(DEFAULT_PLATFORM_FEATURES),
  smtpConfig: jsonb('smtp_config').$type<SmtpSettings | null>(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
});

/**
 * One row per server-based dialect — tracks the admin-managed long-lived container that now serves
 * every project for that engine (replaces spinning up a fresh server per query). `containerId` is the
 * live Docker container id while `status` is `running`; lifecycle.service.ts self-heals to `stopped`
 * if that container is found dead (e.g. the host restarted) rather than trusting this table blindly.
 */
export const sandboxEnginesTable = pgTable('sandbox_engines', {
  dialect: serverDialectEnum('dialect').primaryKey(),
  containerId: text('container_id'),
  status: engineStatusEnum('status').notNull().default('stopped'),
  startedAt: timestamp('started_at', { withTimezone: true }),
});

/** Single-use tokens for the email verification flow (signup + email change). */
export const emailVerificationTokensTable = pgTable(
  'email_verification_tokens',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    userId: uuid('user_id')
      .notNull()
      .references(() => usersTable.id, { onDelete: 'cascade' }),
    email: text('email').notNull(),
    tokenHash: text('token_hash').notNull().unique(),
    expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
    usedAt: timestamp('used_at', { withTimezone: true }),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index('idx_email_verification_tokens_user_id').on(t.userId)],
);

/** Classroom / Courses table */
export const coursesTable = pgTable(
  'classroom_courses',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    teacherId: uuid('teacher_id')
      .notNull()
      .references(() => usersTable.id, { onDelete: 'cascade' }),
    title: text('title').notNull(),
    description: text('description').notNull().default(''),
    joinCode: text('join_code').notNull().unique(),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
    ...softDeleteColumn,
  },
  (t) => [
    index('idx_classroom_courses_teacher_id').on(t.teacherId),
    index('idx_classroom_courses_join_code').on(t.joinCode),
  ],
);

/** Course Enrollments */
export const courseEnrollmentsTable = pgTable(
  'classroom_course_enrollments',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    courseId: uuid('course_id')
      .notNull()
      .references(() => coursesTable.id, { onDelete: 'cascade' }),
    studentId: uuid('student_id')
      .notNull()
      .references(() => usersTable.id, { onDelete: 'cascade' }),
    joinedAt: timestamp('joined_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    index('idx_classroom_enrollments_course_id').on(t.courseId),
    index('idx_classroom_enrollments_student_id').on(t.studentId),
    uniqueIndex('uniq_course_student').on(t.courseId, t.studentId),
  ],
);

/** Assignments / Labs */
export const assignmentsTable = pgTable(
  'classroom_assignments',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    courseId: uuid('course_id')
      .notNull()
      .references(() => coursesTable.id, { onDelete: 'cascade' }),
    title: text('title').notNull(),
    description: text('description').notNull().default(''),
    dialect: dialectEnum('dialect').notNull(),
    initialSchemaSql: text('initial_schema_sql').notNull().default(''),
    referenceQuerySql: text('reference_query_sql').notNull().default(''),
    maxScore: integer('max_score').notNull().default(100),
    dueDate: timestamp('due_date', { withTimezone: true }),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
    ...softDeleteColumn,
  },
  (t) => [index('idx_classroom_assignments_course_id').on(t.courseId)],
);

/** Student Submissions */
export const assignmentSubmissionsTable = pgTable(
  'classroom_submissions',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    assignmentId: uuid('assignment_id')
      .notNull()
      .references(() => assignmentsTable.id, { onDelete: 'cascade' }),
    studentId: uuid('student_id')
      .notNull()
      .references(() => usersTable.id, { onDelete: 'cascade' }),
    submittedSql: text('submitted_sql').notNull(),
    score: integer('score').notNull().default(0),
    passed: boolean('passed').notNull().default(false),
    tupleMatchPassed: boolean('tuple_match_passed').notNull().default(false),
    astViolationsCount: integer('ast_violations_count').notNull().default(0),
    executionTimeMs: integer('execution_time_ms').notNull().default(0),
    feedback: jsonb('feedback').notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    index('idx_classroom_submissions_assignment_id').on(t.assignmentId),
    index('idx_classroom_submissions_student_id').on(t.studentId),
  ],
);

/** Shareable Playground Queries & Schemas (Permalinks) */
export const playgroundSharesTable = pgTable(
  'playground_shares',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    authorId: uuid('author_id')
      .notNull()
      .references(() => usersTable.id, { onDelete: 'cascade' }),
    title: text('title').notNull(),
    notes: text('notes').notNull().default(''),
    sql: text('sql').notNull(),
    dialect: dialectEnum('dialect').notNull(),
    schemaStatements: jsonb('schema_statements').$type<SchemaStatement[]>().notNull().default([]),
    schemaTables: jsonb('schema_tables').$type<TableSchema[]>().notNull().default([]),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index('idx_playground_shares_author_id').on(t.authorId)],
);

/** Query Golf & Gamification Challenges */
export const challengesTable = pgTable(
  'challenges',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    title: text('title').notNull(),
    description: text('description').notNull(),
    dialect: dialectEnum('dialect').notNull(),
    difficulty: text('difficulty').notNull().default('medium'),
    initialSchemaSql: text('initial_schema_sql').notNull(),
    referenceQuerySql: text('reference_query_sql').notNull(),
    targetExecutionTimeMs: real('target_execution_time_ms').notNull().default(10.0),
    targetBuffersRead: integer('target_buffers_read').notNull().default(100),
    creatorId: uuid('creator_id').references(() => usersTable.id, { onDelete: 'set null' }),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index('idx_challenges_difficulty').on(t.difficulty), index('idx_challenges_dialect').on(t.dialect)],
);

/** Challenge Submissions / Leaderboard Runs */
export const challengeSubmissionsTable = pgTable(
  'challenge_submissions',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    challengeId: uuid('challenge_id')
      .notNull()
      .references(() => challengesTable.id, { onDelete: 'cascade' }),
    userId: uuid('user_id')
      .notNull()
      .references(() => usersTable.id, { onDelete: 'cascade' }),
    sql: text('sql').notNull(),
    passed: boolean('passed').notNull().default(false),
    executionTimeMs: real('execution_time_ms').notNull().default(0),
    buffersRead: integer('buffers_read').notNull().default(0),
    queryLength: integer('query_length').notNull().default(0),
    golfScore: integer('golf_score').notNull().default(0),
    parStatus: text('par_status').notNull().default('par'),
    astIssuesCount: integer('ast_issues_count').notNull().default(0),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    index('idx_challenge_submissions_challenge_id').on(t.challengeId),
    index('idx_challenge_submissions_user_id').on(t.userId),
    index('idx_challenge_submissions_leaderboard').on(t.challengeId, t.passed, t.buffersRead, t.executionTimeMs),
  ],
);
