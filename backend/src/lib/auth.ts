import { createHash, randomBytes } from 'crypto';

/** Password hashing via Bun's native argon2id — no external dependency needed. */
export function hashPassword(password: string): Promise<string> {
  return Bun.password.hash(password, { algorithm: 'argon2id' });
}

export function verifyPassword(password: string, hash: string): Promise<boolean> {
  return Bun.password.verify(password, hash);
}

export interface JwtPayload {
  sub: string;
  email: string;
  role: 'admin' | 'user';
}

/** For refresh/reset/verification tokens — random, not user-chosen, so a fast hash (not argon2) is fine for storage. */
export function generateOpaqueToken(): string {
  return randomBytes(32).toString('base64url');
}

export function hashOpaqueToken(token: string): string {
  return createHash('sha256').update(token).digest('hex');
}
