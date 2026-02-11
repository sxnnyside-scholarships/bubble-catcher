import { Elysia } from 'elysia';
import { AppError } from '../lib/errors';
import { error as errorResponse } from '../lib/response';

/**
 * Global error handler that converts AppError instances to structured responses.
 *
 * .as('global') ensures this onError hook propagates to ALL routes in the app,
 * including routes inside nested .group() and .use() chains.
 * Required by Elysia >=1.1 where plugin hooks are local-scoped by default.
 */
export const errorHandler = new Elysia({ name: 'error-handler' })
  .onError(({ error, set }) => {
    if (error instanceof AppError) {
      set.status = error.statusCode;
      return errorResponse(error.code, error.message, error.details);
    }

    /* Elysia validation errors */
    if (error.name === 'ValidationError') {
      set.status = 400;
      return errorResponse('VALIDATION_ERROR', 'Invalid request data', error.message);
    }

    console.error('[ErrorHandler] Unexpected error:', error);
    set.status = 500;
    return errorResponse('INTERNAL_ERROR', 'An unexpected error occurred');
  })
  .as('global');
