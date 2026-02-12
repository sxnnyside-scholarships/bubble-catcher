import { Elysia } from 'elysia';
import { authMiddleware, ensureProfileMiddleware } from '../middleware';
import { getTelemetrySummary } from '../services/telemetry.service';
import { success } from '../lib/response';

export const telemetryRoutes = new Elysia({ prefix: '/telemetry' })
  .use(authMiddleware)
  .use(ensureProfileMiddleware)

  /* Get telemetry summary for current user */
  .get('/summary', async ({ auth }) => {
    const summary = await getTelemetrySummary(auth.userId);
    return success(summary);
  });
