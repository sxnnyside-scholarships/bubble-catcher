import { Elysia } from 'elysia';
import { supabaseAdmin } from '../lib/supabase';
import { AppError } from '../lib/errors';

export interface AuthContext {
  userId: string;
  email: string;
  accessToken: string;
}

/**
 * Authentication middleware that validates Supabase JWT tokens.
 * Extracts user info and attaches to request context.
 *
 * **All auth failures return 401 — never 500.**
 *
 * NOTE: .as('plugin') is required so derive/beforeHandle hooks propagate
 * to routes in the *parent* plugin that calls .use(authMiddleware).
 * Without it, Elysia >=1.1 treats plugin hooks as local-only and they
 * silently never fire for routes defined outside this plugin instance.
 */
export const authMiddleware = new Elysia({ name: 'auth' })
  .derive(async ({ headers }): Promise<{ auth: AuthContext }> => {
    const authHeader = headers['authorization'];
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      throw new AppError('UNAUTHORIZED', 'UNAUTHORIZED', 401);
    }

    const token = authHeader.slice(7).trim();
    if (!token) {
      throw new AppError('UNAUTHORIZED', 'UNAUTHORIZED', 401);
    }

    // Defensive: validate JWT structure before sending to Supabase
    const jwtParts = token.split('.');
    if (jwtParts.length !== 3 || jwtParts.some((p) => p.length === 0)) {
      throw new AppError('UNAUTHORIZED', 'UNAUTHORIZED', 401);
    }

    try {
      const { data: { user }, error } = await supabaseAdmin.auth.getUser(token);

      if (error || !user) {
        throw new AppError('UNAUTHORIZED', 'UNAUTHORIZED', 401);
      }

      if (!user.email) {
        throw new AppError('UNAUTHORIZED', 'UNAUTHORIZED', 401);
      }

      return {
        auth: {
          userId: user.id,
          email: user.email,
          accessToken: token,
        },
      };
    } catch (err) {
      /* Re-throw AppError as-is; convert any unexpected Supabase/network error to 401 */
      if (err instanceof AppError) throw err;
      const msg = err instanceof Error ? err.message : 'Authentication failed';
      throw new AppError('UNAUTHORIZED', 'UNAUTHORIZED', 401, { reason: msg });
    }
  })
  .as('plugin');
