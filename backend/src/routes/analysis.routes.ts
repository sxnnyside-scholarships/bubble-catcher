import { Elysia, t } from 'elysia';
import { authMiddleware, ensureProfileMiddleware } from '../middleware';
import { analysisService } from '../services';
import { success } from '../lib/response';

export const analysisRoutes = new Elysia({ prefix: '/analysis' })
  .use(authMiddleware)
  .use(ensureProfileMiddleware)

  /* Analyze a SQL query */
  .post('/analyze', async ({ body }) => {
    const result = analysisService.analyze(body.sql, body.dialect);
    return success(result);
  }, {
    body: t.Object({
      sql: t.String({ minLength: 1 }),
      dialect: t.String({ minLength: 1 }),
    }),
  });
