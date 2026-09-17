import { Elysia } from 'elysia';
import { success } from '../lib/response';
import { authMiddleware } from '../middleware';
import { getExecutionHealth, getExecutionTrend, getTelemetrySummary } from '../services/telemetry.service';

export const telemetryRoutes = new Elysia({ prefix: '/telemetry' })
  .use(authMiddleware)

  .get('/summary', async ({ auth }) => {
    const summary = await getTelemetrySummary(auth.userId);
    return success(summary);
  })

  /** Powers the Workspace dashboard: KPI cards (execution health) + 7-day usage trend, both scoped to the caller. */
  .get('/workspace', async ({ auth }) => {
    const [health, trend] = await Promise.all([getExecutionHealth(auth.userId), getExecutionTrend(auth.userId, 7)]);
    return success({ health, trend });
  });
