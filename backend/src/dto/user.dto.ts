import type { UserProfile } from '@shared/types';
import type { usersTable } from '../db/schema';

type UserRow = typeof usersTable.$inferSelect;

/** Maps a DB user row to the public API shape — never leaks passwordHash. */
export function toUserProfileDto(row: UserRow): UserProfile {
  return {
    id: row.id,
    email: row.email,
    displayName: row.displayName,
    role: row.role,
    status: row.status,
    isOwner: row.isOwner,
    emailVerified: row.emailVerifiedAt != null,
    preferredTheme: row.preferences.theme,
    preferredLocale: row.preferences.locale,
    createdAt: row.createdAt.toISOString(),
  };
}
