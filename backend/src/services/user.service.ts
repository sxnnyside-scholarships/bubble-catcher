import { createUserClient, supabaseAdmin } from '../lib/supabase';
import { AppError } from '../lib/errors';
import type { UserProfile, UpdateUserPreferencesPayload } from '@shared/types';

export class UserService {
  /** Get user profile (assumes profile exists via ensureProfileMiddleware) */
  async getProfile(userId: string): Promise<UserProfile> {
    const { data, error } = await supabaseAdmin
      .from('bubble_profiles')
      .select('*')
      .eq('id', userId)
      .single();

    if (error || !data) {
      throw AppError.notFound('NOT_FOUND');
    }

    return mapProfileRow(data);
  }

  /** Update user preferences */
  async updatePreferences(
    userId: string,
    payload: UpdateUserPreferencesPayload,
    accessToken: string,
  ): Promise<UserProfile> {
    const client = createUserClient(accessToken);
    const updateData: Record<string, unknown> = {};

    if (payload.preferredTheme !== undefined) updateData['preferred_theme'] = payload.preferredTheme;
    if (payload.preferredLocale !== undefined) updateData['preferred_locale'] = payload.preferredLocale;

    const { data, error } = await client
      .from('bubble_profiles')
      .update(updateData)
      .eq('id', userId)
      .select('*')
      .single();

    if (error || !data) throw AppError.internal('INTERNAL_ERROR');
    return mapProfileRow(data);
  }
}

function mapProfileRow(row: Record<string, unknown>): UserProfile {
  return {
    id: row['id'] as string,
    email: row['email'] as string,
    plan: row['plan'] as UserProfile['plan'],
    preferredTheme: row['preferred_theme'] as UserProfile['preferredTheme'],
    preferredLocale: row['preferred_locale'] as UserProfile['preferredLocale'],
    createdAt: row['created_at'] as string,
  };
}

export const userService = new UserService();
