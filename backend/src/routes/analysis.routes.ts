import { Elysia, t } from 'elysia';
import { authMiddleware, ensureProfileMiddleware } from '../middleware';
import { analysisService, getPlanLimits } from '../services';
import { recordTelemetry } from '../services/telemetry.service';
import { RateLimiter } from '../services/rate-limiter';
import { success } from '../lib/response';
import { supabaseAdmin } from '../lib/supabase';
import { AppError } from '../lib/errors';
import { logger, hashQuery } from '../lib/logger';
import type { PlanTier } from '../analysis/rule.interface';

/** Per-user analysis rate limiter (separate from execution) */
const analysisRateLimiter = new RateLimiter();

export const analysisRoutes = new Elysia({ prefix: '/analysis' })
  .use(authMiddleware)
  .use(ensureProfileMiddleware)

  /* Analyze a SQL query */
  .post('/analyze', async ({ body, auth }) => {
    /* Fetch user plan for rule gating + limits */
    let userPlan: PlanTier = 'free';
    try {
      const { data } = await supabaseAdmin
        .from('bubble_profiles')
        .select('plan')
        .eq('id', auth.userId)
        .maybeSingle();
      if (data?.plan) userPlan = data.plan as PlanTier;
    } catch { /* default to free */ }

    const limits = getPlanLimits(userPlan);

    /* Query length enforcement → 403 */
    if (body.sql.length > limits.maxQueryLength) {
      throw AppError.forbidden('QUERY_LENGTH_EXCEEDED', {
        max: limits.maxQueryLength,
        current: body.sql.length,
        plan: userPlan,
      });
    }

    /* Analysis rate limit → 429 */
    if (!analysisRateLimiter.check(auth.userId, limits.maxAnalysisPerMinute)) {
      const retryAfter = analysisRateLimiter.getRetryAfter(auth.userId);
      throw new AppError('RATE_LIMIT_EXCEEDED', 'RATE_LIMIT_EXCEEDED', 429, {
        maxPerMinute: limits.maxAnalysisPerMinute,
        retryAfter,
      });
    }
    analysisRateLimiter.record(auth.userId);

    const result = analysisService.analyze(body.sql, body.dialect, userPlan);

    /* Telemetry (non-blocking) */
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
  }, {
    body: t.Object({
      sql: t.String({ minLength: 1 }),
      dialect: t.Union([
        t.Literal('mysql'),
        t.Literal('mariadb'),
        t.Literal('postgresql'),
        t.Literal('sqlite'),
        t.Literal('mssql'),
        t.Literal('oracle'),
      ]),
    }),
  });
