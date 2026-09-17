import type { UpdateUserPreferencesPayload, UserProfile } from '@shared/types';
import { and, eq } from 'drizzle-orm';
import { db } from '../db/client';
import { usersTable } from '../db/schema';
import { notDeleted } from '../db/soft-delete';
import { toUserProfileDto } from '../dto/user.dto';
import { AppError } from '../lib/errors';

export class UserService {
  async getProfile(userId: string): Promise<UserProfile> {
    const [row] = await db
      .select()
      .from(usersTable)
      .where(and(eq(usersTable.id, userId), notDeleted(usersTable.deletedAt)));

    if (!row) throw AppError.notFound('NOT_FOUND');
    return toUserProfileDto(row);
  }

  async updatePreferences(userId: string, payload: UpdateUserPreferencesPayload): Promise<UserProfile> {
    const [current] = await db
      .select()
      .from(usersTable)
      .where(and(eq(usersTable.id, userId), notDeleted(usersTable.deletedAt)));

    if (!current) throw AppError.notFound('NOT_FOUND');

    const [row] = await db
      .update(usersTable)
      .set({
        preferences: {
          theme: payload.preferredTheme ?? current.preferences.theme,
          locale: payload.preferredLocale ?? current.preferences.locale,
        },
      })
      .where(eq(usersTable.id, userId))
      .returning();

    if (!row) throw AppError.internal('INTERNAL_ERROR');
    return toUserProfileDto(row);
  }
}

export const userService = new UserService();
