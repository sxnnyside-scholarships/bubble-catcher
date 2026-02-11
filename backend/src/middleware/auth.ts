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
 * NOTE: .as('plugin') is required so derive/beforeHandle hooks propagate
 * to routes in the *parent* plugin that calls .use(authMiddleware).
 * Without it, Elysia >=1.1 treats plugin hooks as local-only and they
 * silently never fire for routes defined outside this plugin instance.
 */
export const authMiddleware = new Elysia({ name: 'auth' })
  .derive(async ({ headers }): Promise<{ auth: AuthContext }> => {
    const authHeader = headers['authorization'];
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      throw new AppError('UNAUTHORIZED', 'Missing or invalid authorization header', 401);
    }

    const token = authHeader.slice(7).trim();
    if (!token) {
      throw new AppError('UNAUTHORIZED', 'Empty token', 401);
    }

    // Defensive: validate JWT structure before sending to Supabase
    const jwtParts = token.split('.');
    if (jwtParts.length !== 3 || jwtParts.some((p) => p.length === 0)) {
      throw new AppError('UNAUTHORIZED', 'Malformed token', 401);
    }

    const { data: { user }, error } = await supabaseAdmin.auth.getUser(token);

    if (error || !user) {
      throw new AppError('UNAUTHORIZED', 'Invalid or expired token', 401);
    }

    if (!user.email) {
      throw new AppError('UNAUTHORIZED', 'User email not available', 401);
    }

    return {
      auth: {
        userId: user.id,
        email: user.email,
        accessToken: token,
      },
    };
  })
  .as('plugin');
