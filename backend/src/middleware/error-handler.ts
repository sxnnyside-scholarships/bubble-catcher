import { Elysia } from 'elysia';
import { AppError } from '../lib/errors';
import { logger } from '../lib/logger';
import { error as errorResponse } from '../lib/response';

/** Best-effort: pull the `summary` field out of an Elysia ValidationError's JSON-stringified message. */
function extractValidationSummary(error: unknown): string | undefined {
  if (!(error instanceof Error)) return undefined;
  try {
    const parsed = JSON.parse(error.message) as { summary?: unknown };
    return typeof parsed.summary === 'string' ? parsed.summary : undefined;
  } catch {
    return undefined;
  }
}

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

    /* error.code, not error.name — Elysia's ValidationError reports name:'Error'. */
    if ('code' in error && error.code === 'VALIDATION') {
      set.status = 400;
      const detail = extractValidationSummary(error);

      logger.warn('request.validation_error', {
        method: request.method,
        path: url.pathname,
        status: 400,
        detail,
      });

      return errorResponse('VALIDATION_ERROR', 'VALIDATION_ERROR', detail ? { summary: detail } : undefined);
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
