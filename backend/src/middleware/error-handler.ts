import { Elysia } from 'elysia';
import { AppError } from '../lib/errors';
import { error as errorResponse } from '../lib/response';
import { logger } from '../lib/logger';

/**
 * Global error handler that converts AppError instances to structured responses.
 *
 * .as('global') ensures this onError hook propagates to ALL routes in the app,
 * including routes inside nested .group() and .use() chains.
 * Required by Elysia >=1.1 where plugin hooks are local-scoped by default.
 */
export const errorHandler = new Elysia({ name: 'error-handler' })
  .onError(({ error, set, request }) => {
    const url = new URL(request.url);

    if (error instanceof AppError) {
      set.status = error.statusCode;

      logger.warn('request.error', {
        method: request.method,
        path: url.pathname,
        status: error.statusCode,
        code: error.code,
      });

      return errorResponse(error.code, error.code, error.details);
    }

    /* Elysia validation errors → 400 */
    if ('name' in error && error.name === 'ValidationError') {
      set.status = 400;

      logger.warn('request.validation_error', {
        method: request.method,
        path: url.pathname,
        status: 400,
      });

      return errorResponse('VALIDATION_ERROR', 'VALIDATION_ERROR');
    }

    /* Unexpected error → 500 */
    const message = error instanceof Error ? error.message : String(error);
    logger.error('request.unexpected_error', {
      method: request.method,
      path: url.pathname,
      status: 500,
      reason: message,
    });

    set.status = 500;
    return errorResponse('INTERNAL_ERROR', 'INTERNAL_ERROR');
  })
  .as('global');
