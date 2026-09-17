import { and, eq, gt, isNull } from 'drizzle-orm';
import { config } from '../config';
import { db } from '../db/client';
import { emailVerificationTokensTable, passwordResetTokensTable, refreshTokensTable } from '../db/schema';
import { generateOpaqueToken, hashOpaqueToken } from '../lib/auth';

/* ── Refresh tokens ──────────────────────────────────────────────────── */

export async function issueRefreshToken(userId: string): Promise<string> {
  const token = generateOpaqueToken();
  const expiresAt = new Date(Date.now() + config.refreshTokenExpiresInDays * 24 * 60 * 60 * 1000);

  await db.insert(refreshTokensTable).values({
    userId,
    tokenHash: hashOpaqueToken(token),
    expiresAt,
  });

  return token;
}

/** Revokes the presented token and issues a new one — a replayed stolen token becomes detectable as a double-use. */
export async function rotateRefreshToken(presentedToken: string): Promise<{ userId: string; newToken: string } | null> {
  const tokenHash = hashOpaqueToken(presentedToken);

  const [row] = await db
    .select()
    .from(refreshTokensTable)
    .where(
      and(
        eq(refreshTokensTable.tokenHash, tokenHash),
        isNull(refreshTokensTable.revokedAt),
        gt(refreshTokensTable.expiresAt, new Date()),
      ),
    );

  if (!row) return null;

  await db.update(refreshTokensTable).set({ revokedAt: new Date() }).where(eq(refreshTokensTable.id, row.id));
  const newToken = await issueRefreshToken(row.userId);

  return { userId: row.userId, newToken };
}

export async function revokeRefreshToken(presentedToken: string): Promise<void> {
  const tokenHash = hashOpaqueToken(presentedToken);
  await db.update(refreshTokensTable).set({ revokedAt: new Date() }).where(eq(refreshTokensTable.tokenHash, tokenHash));
}

/** Revokes every active refresh token for a user — "log out everywhere". Used on password change/reset and by admin force-logout. */
export async function revokeAllRefreshTokens(userId: string): Promise<void> {
  await db
    .update(refreshTokensTable)
    .set({ revokedAt: new Date() })
    .where(and(eq(refreshTokensTable.userId, userId), isNull(refreshTokensTable.revokedAt)));
}

/* ── Password reset ──────────────────────────────────────────────────── */

export async function issuePasswordResetToken(userId: string): Promise<string> {
  const token = generateOpaqueToken();
  const expiresAt = new Date(Date.now() + config.passwordResetTokenExpiresInMinutes * 60 * 1000);

  await db.insert(passwordResetTokensTable).values({
    userId,
    tokenHash: hashOpaqueToken(token),
    expiresAt,
  });

  return token;
}

export async function consumePasswordResetToken(presentedToken: string): Promise<{ userId: string } | null> {
  const tokenHash = hashOpaqueToken(presentedToken);

  const [row] = await db
    .select()
    .from(passwordResetTokensTable)
    .where(
      and(
        eq(passwordResetTokensTable.tokenHash, tokenHash),
        isNull(passwordResetTokensTable.usedAt),
        gt(passwordResetTokensTable.expiresAt, new Date()),
      ),
    );

  if (!row) return null;

  await db.update(passwordResetTokensTable).set({ usedAt: new Date() }).where(eq(passwordResetTokensTable.id, row.id));
  return { userId: row.userId };
}

/* ── Email verification ──────────────────────────────────────────────── */

export async function issueEmailVerificationToken(userId: string, email: string): Promise<string> {
  const token = generateOpaqueToken();
  const expiresAt = new Date(Date.now() + config.emailVerificationTokenExpiresInHours * 60 * 60 * 1000);

  await db.insert(emailVerificationTokensTable).values({
    userId,
    email,
    tokenHash: hashOpaqueToken(token),
    expiresAt,
  });

  return token;
}

export async function consumeEmailVerificationToken(
  presentedToken: string,
): Promise<{ userId: string; email: string } | null> {
  const tokenHash = hashOpaqueToken(presentedToken);

  const [row] = await db
    .select()
    .from(emailVerificationTokensTable)
    .where(
      and(
        eq(emailVerificationTokensTable.tokenHash, tokenHash),
        isNull(emailVerificationTokensTable.usedAt),
        gt(emailVerificationTokensTable.expiresAt, new Date()),
      ),
    );

  if (!row) return null;

  await db
    .update(emailVerificationTokensTable)
    .set({ usedAt: new Date() })
    .where(eq(emailVerificationTokensTable.id, row.id));
  return { userId: row.userId, email: row.email };
}
