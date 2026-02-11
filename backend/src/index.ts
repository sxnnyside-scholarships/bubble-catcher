import { Elysia } from 'elysia';
import { cors } from '@elysiajs/cors';
import { config } from './config';
import { errorHandler } from './middleware/error-handler';
import { projectRoutes, analysisRoutes, executionRoutes, userRoutes } from './routes';

const app = new Elysia()
  .use(cors({
    origin: config.corsOrigin,
    credentials: true,
    methods: ['GET', 'POST', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
  }))
  .use(errorHandler)

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
      .use(userRoutes),
  )

  .listen(config.port);

const serverUrl = `http://localhost:${config.port}`;
process.stdout.write(`🫧 Bubble Catcher API running at ${serverUrl}\n`);

export type App = typeof app;
