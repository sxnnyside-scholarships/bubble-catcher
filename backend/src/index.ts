import { cors } from '@elysiajs/cors';
import { swagger } from '@elysiajs/swagger';
import { sql } from 'drizzle-orm';
import { Elysia } from 'elysia';
import { config } from './config';
import { db, pgClient } from './db/client';
import { logger } from './lib/logger';
import { errorHandler } from './middleware/error-handler';
import { ipRateLimit } from './middleware/rate-limit';
import { requestContext } from './middleware/request-context';
import {
  adminRoutes,
  analysisRoutes,
  authRoutes,
  classroomRoutes,
  competitionRoutes,
  executionRoutes,
  projectRoutes,
  publicSettingsRoutes,
  schemaRoutes,
  shareRoutes,
  telemetryRoutes,
  userRoutes,
} from './routes';
import { checkDockerAvailable, startOrphanReaper, stopOrphanReaper, sweepOrphans } from './sandbox';

const PACKAGE_VERSION = '2.0.0';

const app = new Elysia()
  /* ── Global middleware (order matters) ────────────────────────── */
  .use(requestContext)
  .use(ipRateLimit(config.ipRateLimitPerMinute))
  .use(
    cors({
      origin: config.corsOrigins,
      credentials: true,
      methods: ['GET', 'POST', 'PATCH', 'DELETE', 'OPTIONS'],
      allowedHeaders: ['Content-Type', 'Authorization'],
    }),
  )
  .use(
    swagger({
      path: '/docs',
      documentation: {
        info: { title: 'Bubble Catcher API', version: PACKAGE_VERSION },
      },
    }),
  )
  .use(errorHandler)

  /* ── Response logging ────────────────────────────────────────── */
  .onAfterHandle(({ request, set, requestId, clientIp }) => {
    const url = new URL(request.url);
    /* Skip noisy health checks */
    if (url.pathname === '/health') return;

    logger.info('request.completed', {
      requestId,
      ip: clientIp,
      method: request.method,
      path: url.pathname,
      status: typeof set.status === 'number' ? set.status : 200,
    });
  })

  /* No auth required — actually checks dependencies rather than always reporting 'ok'. */
  .get('/health', async ({ set }) => {
    const [dbOk, dockerOk] = await Promise.all([
      db
        .execute(sql`select 1`)
        .then(() => true)
        .catch(() => false),
      checkDockerAvailable(),
    ]);

    const healthy = dbOk; // Docker being down only degrades sandbox execution, not the whole API
    set.status = healthy ? 200 : 503;

    return {
      status: healthy ? 'ok' : 'degraded',
      service: 'bubble-catcher-api',
      version: PACKAGE_VERSION,
      dependencies: {
        database: dbOk ? 'ok' : 'unreachable',
        docker: dockerOk ? 'ok' : 'unreachable',
      },
      timestamp: new Date().toISOString(),
    };
  })

  /* API routes */
  .group('/api/v1', (api) =>
    api
      .use(authRoutes)
      .use(adminRoutes)
      .use(projectRoutes)
      .use(classroomRoutes)
      .use(competitionRoutes)
      .use(publicSettingsRoutes)
      .use(schemaRoutes)
      .use(analysisRoutes)
      .use(executionRoutes)
      .use(userRoutes)
      .use(shareRoutes)
      .use(telemetryRoutes),
  )

  .listen(config.port);

startOrphanReaper();

const serverUrl = `http://localhost:${config.port}`;
logger.info('server.started', { url: serverUrl, corsOrigins: config.corsOrigins });

async function shutdown(signal: string): Promise<void> {
  logger.info('server.shutting_down', { signal });
  try {
    stopOrphanReaper();
    await sweepOrphans().catch(() => {});
    await app.stop();
    await pgClient.end({ timeout: 5 });
  } catch (err) {
    logger.error('server.stop_failed', { reason: err instanceof Error ? err.message : String(err) });
  }
  process.exit(0);
}

process.on('SIGTERM', () => void shutdown('SIGTERM'));
process.on('SIGINT', () => void shutdown('SIGINT'));

export type App = typeof app;
