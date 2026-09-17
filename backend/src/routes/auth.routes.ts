import { and, count, eq, sql } from 'drizzle-orm';
import { Elysia, t } from 'elysia';
import { db } from '../db/client';
import { DEFAULT_USER_PREFERENCES, usersTable } from '../db/schema';
import { notDeleted } from '../db/soft-delete';
import { toUserProfileDto } from '../dto/user.dto';
import { hashPassword, verifyPassword } from '../lib/auth';
import { AppError } from '../lib/errors';
import { sendEmailVerificationEmail, sendPasswordResetEmail } from '../lib/mailer';
import { success } from '../lib/response';
import { authMiddleware, jwtPlugin } from '../middleware';
import { getRegistrationMode } from '../services/settings.service';
import {
  consumeEmailVerificationToken,
  consumePasswordResetToken,
  issueEmailVerificationToken,
  issuePasswordResetToken,
  issueRefreshToken,
  revokeAllRefreshTokens,
  revokeRefreshToken,
  rotateRefreshToken,
} from '../services/token.service';

/** Serializes the "is this the first user?" check so two concurrent signups can't both become admin. */
const FIRST_USER_LOCK_KEY = 78_412_003;

export const authRoutes = new Elysia({ prefix: '/auth' })
  .use(jwtPlugin)

  /* Sign up — the first user of the instance becomes admin (race-safe via advisory lock) */
  .post(
    '/signup',
    async ({ body, jwt }) => {
      const email = body.email.toLowerCase().trim();
      const name = body.name.trim();

      const [existing] = await db
        .select({ id: usersTable.id })
        .from(usersTable)
        .where(and(eq(usersTable.email, email), notDeleted(usersTable.deletedAt)));

      if (existing) {
        throw AppError.conflict('EMAIL_ALREADY_REGISTERED');
      }

      const passwordHash = await hashPassword(body.password);
      const registrationMode = await getRegistrationMode();

      const row = await db.transaction(async (tx) => {
        /* Serialize against other concurrent signups for the duration of this transaction */
        await tx.execute(sql`SELECT pg_advisory_xact_lock(${FIRST_USER_LOCK_KEY})`);

        const [{ value: userCount }] = await tx.select({ value: count() }).from(usersTable);
        const isFirstUser = userCount === 0;

        /* The very first account always bootstraps the instance regardless of registration governance. */
        if (!isFirstUser && registrationMode === 'invite_only') {
          throw AppError.forbidden('REGISTRATION_DISABLED');
        }

        const pending = !isFirstUser && registrationMode === 'approval_required';

        const [inserted] = await tx
          .insert(usersTable)
          .values({
            email,
            displayName: name,
            passwordHash,
            role: isFirstUser ? 'admin' : 'user',
            status: pending ? 'pending_approval' : 'active',
            isOwner: isFirstUser,
            preferences: DEFAULT_USER_PREFERENCES,
          })
          .returning();

        return inserted;
      });

      if (!row) throw AppError.internal('INTERNAL_ERROR');

      if (row.status === 'pending_approval') {
        return success({ pending: true });
      }

      const verificationToken = await issueEmailVerificationToken(row.id, row.email);
      sendEmailVerificationEmail(row.email, verificationToken);

      const accessToken = await jwt.sign({ sub: row.id, email: row.email, role: row.role });
      const refreshToken = await issueRefreshToken(row.id);
      return success({ accessToken, refreshToken, user: toUserProfileDto(row) });
    },
    {
      body: t.Object({
        name: t.String({ minLength: 1, maxLength: 100 }),
        email: t.String({ format: 'email' }),
        password: t.String({ minLength: 8, maxLength: 200 }),
      }),
    },
  )

  /* Log in */
  .post(
    '/login',
    async ({ body, jwt }) => {
      const email = body.email.toLowerCase().trim();

      const [row] = await db
        .select()
        .from(usersTable)
        .where(and(eq(usersTable.email, email), notDeleted(usersTable.deletedAt)));

      if (!row) {
        throw AppError.unauthorized('INVALID_CREDENTIALS');
      }

      const valid = await verifyPassword(body.password, row.passwordHash);
      if (!valid) {
        throw AppError.unauthorized('INVALID_CREDENTIALS');
      }

      if (row.status === 'suspended') {
        throw AppError.forbidden('ACCOUNT_SUSPENDED');
      }

      if (row.status === 'pending_approval') {
        throw AppError.forbidden('ACCOUNT_PENDING_APPROVAL');
      }

      const accessToken = await jwt.sign({ sub: row.id, email: row.email, role: row.role });
      const refreshToken = await issueRefreshToken(row.id);
      return success({ accessToken, refreshToken, user: toUserProfileDto(row) });
    },
    {
      body: t.Object({
        email: t.String({ format: 'email' }),
        password: t.String({ minLength: 1 }),
      }),
    },
  )

  .post(
    '/refresh',
    async ({ body, jwt }) => {
      const rotated = await rotateRefreshToken(body.refreshToken);
      if (!rotated) {
        throw AppError.unauthorized('INVALID_REFRESH_TOKEN');
      }

      const [row] = await db
        .select()
        .from(usersTable)
        .where(and(eq(usersTable.id, rotated.userId), notDeleted(usersTable.deletedAt)));

      if (!row || row.status === 'suspended') {
        throw AppError.unauthorized('INVALID_REFRESH_TOKEN');
      }

      const accessToken = await jwt.sign({ sub: row.id, email: row.email, role: row.role });
      return success({ accessToken, refreshToken: rotated.newToken });
    },
    {
      body: t.Object({ refreshToken: t.String({ minLength: 1 }) }),
    },
  )

  /* Log out this device/session — revokes the presented refresh token only */
  .post(
    '/logout',
    async ({ body }) => {
      await revokeRefreshToken(body.refreshToken);
      return success({ loggedOut: true });
    },
    {
      body: t.Object({ refreshToken: t.String({ minLength: 1 }) }),
    },
  )

  /*
   * Always responds 200 regardless of whether the email exists — otherwise
   * this endpoint becomes an account-enumeration oracle.
   */
  .post(
    '/forgot-password',
    async ({ body }) => {
      const email = body.email.toLowerCase().trim();

      const [row] = await db
        .select()
        .from(usersTable)
        .where(and(eq(usersTable.email, email), notDeleted(usersTable.deletedAt)));

      if (row) {
        const token = await issuePasswordResetToken(row.id);
        sendPasswordResetEmail(row.email, token);
      }

      return success({ requested: true });
    },
    {
      body: t.Object({ email: t.String({ format: 'email' }) }),
    },
  )

  .post(
    '/reset-password',
    async ({ body }) => {
      const consumed = await consumePasswordResetToken(body.token);
      if (!consumed) {
        throw AppError.badRequest('INVALID_OR_EXPIRED_TOKEN');
      }

      const passwordHash = await hashPassword(body.newPassword);
      await db.update(usersTable).set({ passwordHash }).where(eq(usersTable.id, consumed.userId));

      /* Resetting the password invalidates every existing session */
      await revokeAllRefreshTokens(consumed.userId);

      return success({ reset: true });
    },
    {
      body: t.Object({
        token: t.String({ minLength: 1 }),
        newPassword: t.String({ minLength: 8, maxLength: 200 }),
      }),
    },
  )

  .post(
    '/verify-email',
    async ({ body }) => {
      const consumed = await consumeEmailVerificationToken(body.token);
      if (!consumed) {
        throw AppError.badRequest('INVALID_OR_EXPIRED_TOKEN');
      }

      /* Only mark verified if the token's email still matches the account's
       * current email — protects against a stale token from before an email
       * change silently verifying the new address. */
      const [row] = await db.select().from(usersTable).where(eq(usersTable.id, consumed.userId));
      if (row && row.email === consumed.email) {
        await db.update(usersTable).set({ emailVerifiedAt: new Date() }).where(eq(usersTable.id, consumed.userId));
      }

      return success({ verified: true });
    },
    {
      body: t.Object({ token: t.String({ minLength: 1 }) }),
    },
  )

  /* Current session — validates the access token and returns the current user */
  .use(authMiddleware)
  .get('/me', async ({ auth }) => {
    const [row] = await db
      .select()
      .from(usersTable)
      .where(and(eq(usersTable.id, auth.userId), notDeleted(usersTable.deletedAt)));

    if (!row) throw AppError.unauthorized('UNAUTHORIZED');
    return success(toUserProfileDto(row));
  })

  .post('/resend-verification', async ({ auth }) => {
    const [row] = await db.select().from(usersTable).where(eq(usersTable.id, auth.userId));
    if (!row) throw AppError.unauthorized('UNAUTHORIZED');
    if (row.emailVerifiedAt) return success({ alreadyVerified: true });

    const token = await issueEmailVerificationToken(row.id, row.email);
    sendEmailVerificationEmail(row.email, token);
    return success({ sent: true });
  });
