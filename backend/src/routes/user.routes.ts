import { eq } from 'drizzle-orm';
import { Elysia, t } from 'elysia';
import { db } from '../db/client';
import { usersTable } from '../db/schema';
import { softDeleteNow } from '../db/soft-delete';
import { hashPassword, verifyPassword } from '../lib/auth';
import { AppError } from '../lib/errors';
import { sendEmailVerificationEmail } from '../lib/mailer';
import { success } from '../lib/response';
import { authMiddleware } from '../middleware';
import { userService } from '../services';
import { issueEmailVerificationToken, revokeAllRefreshTokens } from '../services/token.service';

export const userRoutes = new Elysia({ prefix: '/user' })
  .use(authMiddleware)

  .get('/profile', async ({ auth }) => {
    const profile = await userService.getProfile(auth.userId);
    return success(profile);
  })

  .patch(
    '/preferences',
    async ({ auth, body }) => {
      const profile = await userService.updatePreferences(auth.userId, body);
      return success(profile);
    },
    {
      body: t.Object({
        preferredTheme: t.Optional(t.Union([t.Literal('colorful'), t.Literal('light'), t.Literal('dark')])),
        preferredLocale: t.Optional(t.Union([t.Literal('en'), t.Literal('es')])),
      }),
    },
  )

  /* Requires the current password — revokes every other session (log out everywhere) after a successful change. */
  .patch(
    '/password',
    async ({ auth, body }) => {
      const [row] = await db.select().from(usersTable).where(eq(usersTable.id, auth.userId));
      if (!row) throw AppError.notFound('NOT_FOUND');

      const valid = await verifyPassword(body.currentPassword, row.passwordHash);
      if (!valid) throw AppError.unauthorized('INVALID_CREDENTIALS');

      const passwordHash = await hashPassword(body.newPassword);
      await db.update(usersTable).set({ passwordHash }).where(eq(usersTable.id, auth.userId));
      await revokeAllRefreshTokens(auth.userId);

      return success({ changed: true });
    },
    {
      body: t.Object({
        currentPassword: t.String({ minLength: 1 }),
        newPassword: t.String({ minLength: 8, maxLength: 200 }),
      }),
    },
  )

  /* Requires the current password — resets email verification, a new verification email is sent. */
  .patch(
    '/email',
    async ({ auth, body }) => {
      const [row] = await db.select().from(usersTable).where(eq(usersTable.id, auth.userId));
      if (!row) throw AppError.notFound('NOT_FOUND');

      const valid = await verifyPassword(body.currentPassword, row.passwordHash);
      if (!valid) throw AppError.unauthorized('INVALID_CREDENTIALS');

      const newEmail = body.newEmail.toLowerCase().trim();
      const [existing] = await db.select({ id: usersTable.id }).from(usersTable).where(eq(usersTable.email, newEmail));
      if (existing) throw AppError.conflict('EMAIL_ALREADY_REGISTERED');

      const [updated] = await db
        .update(usersTable)
        .set({ email: newEmail, emailVerifiedAt: null })
        .where(eq(usersTable.id, auth.userId))
        .returning();

      if (!updated) throw AppError.internal('INTERNAL_ERROR');

      const token = await issueEmailVerificationToken(updated.id, updated.email);
      sendEmailVerificationEmail(updated.email, token);

      return success({ changed: true });
    },
    {
      body: t.Object({
        currentPassword: t.String({ minLength: 1 }),
        newEmail: t.String({ format: 'email' }),
      }),
    },
  )

  /* Self-service account deactivation — soft delete, never a hard DELETE. Requires the current password as confirmation. */
  .delete(
    '/account',
    async ({ auth, body }) => {
      const [row] = await db.select().from(usersTable).where(eq(usersTable.id, auth.userId));
      if (!row) throw AppError.notFound('NOT_FOUND');

      const valid = await verifyPassword(body.password, row.passwordHash);
      if (!valid) throw AppError.unauthorized('INVALID_CREDENTIALS');

      await db.update(usersTable).set({ deletedAt: softDeleteNow() }).where(eq(usersTable.id, auth.userId));
      await revokeAllRefreshTokens(auth.userId);

      return success({ deactivated: true });
    },
    {
      body: t.Object({ password: t.String({ minLength: 1 }) }),
    },
  );
