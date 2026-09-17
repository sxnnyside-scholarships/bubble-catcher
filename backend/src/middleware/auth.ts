import { jwt } from '@elysiajs/jwt';
import { Elysia } from 'elysia';
import { config } from '../config';
import type { JwtPayload } from '../lib/auth';
import { AppError } from '../lib/errors';

export interface AuthContext {
  userId: string;
  email: string;
  role: 'admin' | 'user';
}

/** Shared JWT plugin — sign/verify with the instance's JWT_SECRET. Exported so auth.routes.ts can sign tokens. */
export const jwtPlugin = new Elysia({ name: 'jwt-plugin' }).use(
  jwt({
    name: 'jwt',
    secret: config.jwtSecret,
    exp: config.accessTokenExpiresIn,
  }),
);

/** All auth failures return 401, never 500. `.as('scoped')` propagates the `derive` to routes in the parent `.use(authMiddleware)` plugin. */
export const authMiddleware = new Elysia({ name: 'auth' })
  .use(jwtPlugin)
  .derive(async ({ headers, jwt }): Promise<{ auth: AuthContext }> => {
    const authHeader = headers['authorization'];
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      throw new AppError('UNAUTHORIZED', 'UNAUTHORIZED', 401);
    }

    const token = authHeader.slice(7).trim();
    if (!token) {
      throw new AppError('UNAUTHORIZED', 'UNAUTHORIZED', 401);
    }

    try {
      const payload = (await jwt.verify(token)) as JwtPayload | false;

      if (!payload || !payload.sub || !payload.email || !payload.role) {
        throw new AppError('UNAUTHORIZED', 'UNAUTHORIZED', 401);
      }

      return {
        auth: {
          userId: payload.sub,
          email: payload.email,
          role: payload.role,
        },
      };
    } catch (err) {
      /* Re-throw AppError as-is; convert any unexpected verification error to 401 */
      if (err instanceof AppError) throw err;
      const msg = err instanceof Error ? err.message : 'Authentication failed';
      throw new AppError('UNAUTHORIZED', 'UNAUTHORIZED', 401, { reason: msg });
    }
  })
  .as('scoped');
