import { Elysia } from 'elysia';
import { cors } from '@elysiajs/cors';
import { config } from './config';
import { errorHandler } from './middleware/error-handler';
import { requestContext } from './middleware/request-context';
import { ipRateLimit } from './middleware/rate-limit';
import { logger } from './lib/logger';
import { projectRoutes, analysisRoutes, executionRoutes, userRoutes, telemetryRoutes } from './routes';

const app = new Elysia()
  /* ── Global middleware (order matters) ────────────────────────── */
  .use(requestContext)
  .use(ipRateLimit(config.ipRateLimitPerMinute))
  .use(cors({
    origin: config.corsOrigins,
    credentials: true,
    methods: ['GET', 'POST', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
  }))
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

  /* Health check — no auth required */
  .get('/health', () => ({
    status: 'ok',
    service: 'bubble-catcher-api',
    version: '1.0.0',
    timestamp: new Date().toISOString(),
  }))

  /* API routes */
  .group('/api/v1', (api) =>
    api
      .use(projectRoutes)
      .use(analysisRoutes)
      .use(executionRoutes)
      .use(userRoutes)
      .use(telemetryRoutes),
  )

  .listen(config.port);

const serverUrl = `http://localhost:${config.port}`;
logger.info('server.started', { url: serverUrl, corsOrigins: config.corsOrigins });

export type App = typeof app;
