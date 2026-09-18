import { SERVER_BASED_DIALECTS, type ServerBasedDialect } from '@shared/types';
import { and, count, desc, eq } from 'drizzle-orm';
import { Elysia, t } from 'elysia';
import { config } from '../config';
import { db } from '../db/client';
import { DEFAULT_USER_PREFERENCES, projectsTable, usersTable } from '../db/schema';
import { notDeleted, softDeleteNow } from '../db/soft-delete';
import { toProjectDto } from '../dto/project.dto';
import { toUserProfileDto } from '../dto/user.dto';
import { hashPassword } from '../lib/auth';
import { AppError } from '../lib/errors';
import { sendEmailVerificationEmail } from '../lib/mailer';
import { parsePagination, toPaginatedResponse } from '../lib/pagination';
import { success } from '../lib/response';
import { requireAdmin } from '../middleware';
import { sandboxService } from '../sandbox';
import { recordNotification } from '../services/notification.service';
import { getSystemSettings, updateSystemSettings } from '../services/settings.service';
import { getTelemetrySummary } from '../services/telemetry.service';
import { issueEmailVerificationToken, revokeAllRefreshTokens } from '../services/token.service';

/** Admin endpoints for user management, system settings, sandboxes, and telemetry. */
export const adminRoutes = new Elysia({ prefix: '/admin' })
  .use(requireAdmin)

  /* Paginated user list with optional status filtering. */
  .get(
    '/users',
    async ({ query }) => {
      const pagination = parsePagination(query);
      const filters = [notDeleted(usersTable.deletedAt)];
      if (query['status'])
        filters.push(eq(usersTable.status, query['status'] as typeof usersTable.$inferSelect.status));

      const [rows, [{ value: total }]] = await Promise.all([
        db
          .select()
          .from(usersTable)
          .where(and(...filters))
          .orderBy(desc(usersTable.createdAt))
          .limit(pagination.pageSize)
          .offset(pagination.offset),
        db
          .select({ value: count() })
          .from(usersTable)
          .where(and(...filters)),
      ]);

      return success(toPaginatedResponse(rows.map(toUserProfileDto), total, pagination));
    },
    {
      query: t.Object({
        page: t.Optional(t.String()),
        pageSize: t.Optional(t.String()),
        status: t.Optional(t.Union([t.Literal('active'), t.Literal('suspended'), t.Literal('pending_approval')])),
      }),
    },
  )

  /* Admin-initiated account creation — bypasses registration governance and email verification (admin vouches for the address). */
  .post(
    '/users',
    async ({ body }) => {
      const email = body.email.toLowerCase().trim();

      const [existing] = await db
        .select({ id: usersTable.id })
        .from(usersTable)
        .where(and(eq(usersTable.email, email), notDeleted(usersTable.deletedAt)));

      if (existing) throw AppError.conflict('EMAIL_ALREADY_REGISTERED');

      const passwordHash = await hashPassword(body.password);
      const [row] = await db
        .insert(usersTable)
        .values({
          email,
          displayName: body.name.trim(),
          passwordHash,
          role: body.role ?? 'user',
          status: 'active',
          emailVerifiedAt: new Date(),
          preferences: DEFAULT_USER_PREFERENCES,
        })
        .returning();

      if (!row) throw AppError.internal('INTERNAL_ERROR');
      return success(toUserProfileDto(row));
    },
    {
      body: t.Object({
        name: t.String({ minLength: 1, maxLength: 100 }),
        email: t.String({ format: 'email' }),
        password: t.String({ minLength: 8, maxLength: 200 }),
        role: t.Optional(t.Union([t.Literal('admin'), t.Literal('user')])),
      }),
    },
  )

  /* Approve a pending user account. */
  .post(
    '/users/:id/approve',
    async ({ params }) => {
      const [row] = await db
        .update(usersTable)
        .set({ status: 'active' })
        .where(
          and(
            eq(usersTable.id, params.id),
            eq(usersTable.status, 'pending_approval'),
            notDeleted(usersTable.deletedAt),
          ),
        )
        .returning();

      if (!row) throw AppError.notFound('NOT_FOUND');

      const verificationToken = await issueEmailVerificationToken(row.id, row.email);
      sendEmailVerificationEmail(row.email, verificationToken);

      return success(toUserProfileDto(row));
    },
    {
      params: t.Object({ id: t.String() }),
    },
  )

  /* Reject and soft-delete a pending signup request. */
  .post(
    '/users/:id/reject',
    async ({ params }) => {
      const [row] = await db
        .update(usersTable)
        .set({ deletedAt: softDeleteNow() })
        .where(
          and(
            eq(usersTable.id, params.id),
            eq(usersTable.status, 'pending_approval'),
            notDeleted(usersTable.deletedAt),
          ),
        )
        .returning();

      if (!row) throw AppError.notFound('NOT_FOUND');
      return success({ rejected: true });
    },
    {
      params: t.Object({ id: t.String() }),
    },
  )

  /* Instance-wide account governance and platform settings */
  .get('/settings', async () => {
    const settings = await getSystemSettings();
    return success(settings);
  })

  .patch(
    '/settings',
    async ({ body }) => {
      const prev = await getSystemSettings();
      const updated = await updateSystemSettings(body);
      if (body.enabledFeatures) {
        const prevFeatures = prev.enabledFeatures as unknown as Record<string, boolean>;
        for (const [key, enabled] of Object.entries(body.enabledFeatures)) {
          if (enabled !== undefined && prevFeatures[key] !== enabled) {
            const featureName = key.charAt(0).toUpperCase() + key.slice(1);
            recordNotification(
              enabled ? 'mode_enabled' : 'mode_disabled',
              `${featureName} Mode ${enabled ? 'Enabled' : 'Disabled'}`,
              `Administrator ${enabled ? 'enabled' : 'disabled'} ${featureName} mode for all users.`,
              key,
            );
          }
        }
      }

      return success(updated);
    },

    {
      body: t.Object({
        registrationMode: t.Optional(
          t.Union([t.Literal('open'), t.Literal('invite_only'), t.Literal('approval_required')]),
        ),
        enabledFeatures: t.Optional(
          t.Object({
            sandbox: t.Optional(t.Boolean()),
            playground: t.Optional(t.Boolean()),
            classroom: t.Optional(t.Boolean()),
            competition: t.Optional(t.Boolean()),
          }),
        ),
        smtpConfig: t.Optional(
          t.Nullable(
            t.Object({
              host: t.String(),
              port: t.Number(),
              secure: t.Boolean(),
              user: t.String(),
              password: t.Optional(t.String()),
              from: t.String(),
            }),
          ),
        ),
      }),
    },
  )

  /* Test SMTP configuration before saving */
  .post(
    '/settings/test-smtp',
    async ({ body }) => {
      const nodemailer = (await import('nodemailer')).default;
      try {
        const testTransporter = nodemailer.createTransport({
          host: body.host,
          port: body.port,
          secure: body.secure,
          auth: body.user && body.password ? { user: body.user, pass: body.password } : undefined,
          connectionTimeout: 5000,
        });

        await testTransporter.verify();
        return success({ valid: true, message: 'SMTP connection verified successfully.' });
      } catch (err) {
        throw AppError.badRequest('SMTP_TEST_FAILED', {
          reason: err instanceof Error ? err.message : String(err),
        });
      }
    },
    {
      body: t.Object({
        host: t.String(),
        port: t.Number(),
        secure: t.Boolean(),
        user: t.String(),
        password: t.Optional(t.String()),
        from: t.String(),
      }),
    },
  )

  /* Edit user profile, promote/demote role, or suspend/reactivate a user. Admins cannot modify their own role/status here. */
  .patch(
    '/users/:id',
    async ({ auth, params, body }) => {
      if (params.id === auth.userId && (body.role !== undefined || body.status !== undefined)) {
        throw AppError.forbidden('CANNOT_MODIFY_SELF');
      }

      if (body.email) {
        const email = body.email.toLowerCase().trim();
        const [existing] = await db
          .select({ id: usersTable.id })
          .from(usersTable)
          .where(and(eq(usersTable.email, email), notDeleted(usersTable.deletedAt)));
        if (existing && existing.id !== params.id) {
          throw AppError.conflict('EMAIL_ALREADY_REGISTERED');
        }
      }

      const updateData: Partial<typeof usersTable.$inferInsert> = {};
      if (body.name !== undefined) updateData.displayName = body.name.trim();
      if (body.email !== undefined) updateData.email = body.email.toLowerCase().trim();
      if (body.role !== undefined) updateData.role = body.role;
      if (body.status !== undefined) updateData.status = body.status;

      const [row] = await db
        .update(usersTable)
        .set(updateData)
        .where(and(eq(usersTable.id, params.id), notDeleted(usersTable.deletedAt)))
        .returning();

      if (!row) throw AppError.notFound('NOT_FOUND');

      /* Suspending a user or demoting them should kill their existing sessions immediately */
      if (body.status === 'suspended' || body.role === 'user') {
        await revokeAllRefreshTokens(row.id);
      }

      return success(toUserProfileDto(row));
    },
    {
      params: t.Object({ id: t.String() }),
      body: t.Object({
        name: t.Optional(t.String({ minLength: 1, maxLength: 100 })),
        email: t.Optional(t.String({ format: 'email' })),
        role: t.Optional(t.Union([t.Literal('admin'), t.Literal('user')])),
        status: t.Optional(t.Union([t.Literal('active'), t.Literal('suspended')])),
      }),
    },
  )

  /* Admin password reset for a user */
  .post(
    '/users/:id/password',
    async ({ params, body }) => {
      const passwordHash = await hashPassword(body.password);
      const [row] = await db
        .update(usersTable)
        .set({ passwordHash })
        .where(and(eq(usersTable.id, params.id), notDeleted(usersTable.deletedAt)))
        .returning({ id: usersTable.id });

      if (!row) throw AppError.notFound('NOT_FOUND');

      /* Invalidate existing sessions so user must log in with new password */
      await revokeAllRefreshTokens(row.id);

      return success({ reset: true });
    },
    {
      params: t.Object({ id: t.String() }),
      body: t.Object({
        password: t.String({ minLength: 8, maxLength: 200 }),
      }),
    },
  )

  /* Soft-delete (dar de baja) a user account and revoke all sessions */
  .delete(
    '/users/:id',
    async ({ auth, params }) => {
      if (params.id === auth.userId) {
        throw AppError.forbidden('CANNOT_DELETE_SELF');
      }

      const [row] = await db
        .update(usersTable)
        .set({ deletedAt: softDeleteNow(), status: 'suspended' })
        .where(and(eq(usersTable.id, params.id), notDeleted(usersTable.deletedAt)))
        .returning({ id: usersTable.id });

      if (!row) throw AppError.notFound('NOT_FOUND');

      await revokeAllRefreshTokens(row.id);

      return success({ deleted: true });
    },
    {
      params: t.Object({ id: t.String() }),
    },
  )

  /* Force-logout a user everywhere without changing role/status */
  .post(
    '/users/:id/force-logout',
    async ({ params }) => {
      await revokeAllRefreshTokens(params.id);
      return success({ loggedOut: true });
    },
    {
      params: t.Object({ id: t.String() }),
    },
  )

  /* All projects across all users (support/moderation), paginated */
  .get('/projects', async ({ query }) => {
    const pagination = parsePagination(query);

    const [rows, [{ value: total }]] = await Promise.all([
      db
        .select()
        .from(projectsTable)
        .where(notDeleted(projectsTable.deletedAt))
        .orderBy(desc(projectsTable.createdAt))
        .limit(pagination.pageSize)
        .offset(pagination.offset),
      db.select({ value: count() }).from(projectsTable).where(notDeleted(projectsTable.deletedAt)),
    ]);

    return success(toPaginatedResponse(rows.map(toProjectDto), total, pagination));
  })

  /* Enabled dialects configured via environment variables. */
  .get('/sandbox/dialects', () => success({ enabled: config.enabledDialects }))

  /* Container lifecycle management for persistent database sandbox engines. */
  .get('/sandbox/engines', async () => {
    const engines = await sandboxService.getEngineStates();
    return success({ engines });
  })

  .post(
    '/sandbox/engines/:dialect/start',
    async ({ params }) => {
      const dialectStr = params.dialect as string;
      const engine = await sandboxService.startEngine(dialectStr as ServerBasedDialect);
      const dialectName = dialectStr.charAt(0).toUpperCase() + dialectStr.slice(1);
      recordNotification(
        'engine_started',
        `${dialectName} Engine Online`,
        `Administrator started the ${dialectName} sandbox engine. Engine is ready for queries.`,
        dialectStr,
      );
      return success(engine);
    },
    { params: t.Object({ dialect: t.Union(SERVER_BASED_DIALECTS.map((d) => t.Literal(d))) }) },
  )

  .post(
    '/sandbox/engines/:dialect/stop',
    async ({ params }) => {
      const dialectStr = params.dialect as string;
      const engine = await sandboxService.stopEngine(dialectStr as ServerBasedDialect);
      const dialectName = dialectStr.charAt(0).toUpperCase() + dialectStr.slice(1);
      recordNotification(
        'engine_stopped',
        `${dialectName} Engine Stopped`,
        `Administrator stopped the ${dialectName} sandbox engine.`,
        dialectStr,
      );
      return success(engine);
    },
    { params: t.Object({ dialect: t.Union(SERVER_BASED_DIALECTS.map((d) => t.Literal(d))) }) },
  )

  /* Aggregate telemetry metrics across all users. */
  .get('/telemetry', async () => {
    const summary = await getTelemetrySummary();
    return success(summary);
  });
