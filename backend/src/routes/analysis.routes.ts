import { Elysia, t } from 'elysia';
import { AppError } from '../lib/errors';
import { hashQuery, logger } from '../lib/logger';
import { success } from '../lib/response';
import { authMiddleware } from '../middleware';
import { analysisService } from '../services';
import { RateLimiter } from '../services/rate-limiter';
import { recordTelemetry } from '../services/telemetry.service';
import { getUsageLimits } from '../services/usage-limits';

/** Per-user analysis rate limiter (separate from execution) */
const analysisRateLimiter = new RateLimiter();

export const analysisRoutes = new Elysia({ prefix: '/analysis' })
  .use(authMiddleware)

  .post(
    '/analyze',
    async ({ body, auth }) => {
      const limits = getUsageLimits();

      if (body.sql.length > limits.maxQueryLength) {
        throw AppError.forbidden('QUERY_LENGTH_EXCEEDED', { max: limits.maxQueryLength, current: body.sql.length });
      }

      if (!analysisRateLimiter.check(auth.userId, limits.maxAnalysisPerMinute)) {
        const retryAfter = analysisRateLimiter.getRetryAfter(auth.userId);
        throw new AppError('RATE_LIMIT_EXCEEDED', 'RATE_LIMIT_EXCEEDED', 429, {
          maxPerMinute: limits.maxAnalysisPerMinute,
          retryAfter,
        });
      }
      analysisRateLimiter.record(auth.userId);

      const result = analysisService.analyze(body.sql, body.dialect);

      recordTelemetry({
        userId: auth.userId,
        eventType: 'ANALYSIS',
        dialect: body.dialect,
        executionTimeMs: null,
        success: result.parsedSuccessfully,
        sql: body.sql,
      }).catch(() => {});

      logger.info('analysis.completed', {
        userId: auth.userId,
        dialect: body.dialect,
        issueCount: result.issues.length,
        queryHash: hashQuery(body.sql),
      });

      return success(result);
    },
    {
      body: t.Object({
        sql: t.String({ minLength: 1 }),
        dialect: t.Union([
          t.Literal('mysql'),
          t.Literal('mariadb'),
          t.Literal('postgresql'),
          t.Literal('sqlite'),
          t.Literal('libsql'),
          t.Literal('mssql'),
        ]),
      }),
    },
  );
