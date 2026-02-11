import { Elysia } from 'elysia';
import { supabaseAdmin } from '../lib/supabase';
import { AppError } from '../lib/errors';
import { authMiddleware } from './auth';

/**
 * Middleware that ensures a bubble_profiles row exists for the authenticated user.
 * Internally uses authMiddleware so Elysia resolves the auth context type.
 * Elysia deduplicates by plugin name, so authMiddleware won't run twice.
 *
 * .as('plugin') propagates this plugin's derive hook to parent routes
 * (required by Elysia >=1.1 — hooks are local-scoped by default).
 */
export const ensureProfileMiddleware = new Elysia({ name: 'ensure-profile' })
  .use(authMiddleware)
  .derive(async ({ auth }) => {
    // Check if profile exists
    const { data: existingProfile, error: selectError } = await supabaseAdmin
      .from('bubble_profiles')
      .select('id')
      .eq('id', auth.userId)
      .maybeSingle();

    // If error occurred (but not "no rows"), throw
    if (selectError && selectError.code !== 'PGRST116') {
      console.error('[EnsureProfile] Error checking profile:', selectError);
      throw AppError.internal('Failed to verify user profile');
    }

    // If profile doesn't exist, create it
    if (!existingProfile) {
      const { error: insertError } = await supabaseAdmin
        .from('bubble_profiles')
        .insert({
          id: auth.userId,
          email: auth.email,
          plan: 'free',
          preferred_theme: 'colorful',
          preferred_locale: 'en',
        });

      if (insertError) {
        // If error is duplicate key (profile was created by another request), ignore it
        if (insertError.code === '23505') {
          console.log('[EnsureProfile] Profile already exists (race condition)');
        } else {
          console.error('[EnsureProfile] Failed to create profile:', insertError);
          throw AppError.internal('Failed to initialize user profile');
        }
      } else {
        console.log(`[EnsureProfile] Created profile for user ${auth.userId}`);
      }
    }

    // Return empty object since we're just ensuring the profile exists
    return {};
  })
  .as('plugin');
