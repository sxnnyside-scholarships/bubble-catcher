import { Elysia } from 'elysia';
import { AppError } from '../lib/errors';
import { authMiddleware } from './auth';

/** Compose after authMiddleware — uses its `auth` context. */
export const requireAdmin = new Elysia({ name: 'require-admin' })
  .use(authMiddleware)
  .onBeforeHandle(({ auth }) => {
    if (auth.role !== 'admin') {
      throw AppError.forbidden('ADMIN_REQUIRED');
    }
  })
  .as('scoped');
