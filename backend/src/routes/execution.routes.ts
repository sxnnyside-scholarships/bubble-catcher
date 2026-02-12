import { Elysia, t } from 'elysia';
import { authMiddleware, ensureProfileMiddleware } from '../middleware';
import { executionService } from '../services';
import { success } from '../lib/response';

export const executionRoutes = new Elysia({ prefix: '/execution' })
  .use(authMiddleware)
  .use(ensureProfileMiddleware)

  /* Execute a SQL query in sandbox */
  .post('/run', async ({ auth, body }) => {
    const result = await executionService.execute(
      auth.userId,
      body.projectId,
      body.sql,
      body.dialect,
      auth.accessToken,
    );
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
      ]),
      projectId: t.String({ minLength: 1 }),
    }),
  })

  /* Get execution history */
  .get('/history/:projectId', async ({ auth, params, query }) => {
    const limit = query['limit'] ? parseInt(query['limit'] as string, 10) : 50;
    const history = await executionService.getHistory(
      auth.userId,
      params.projectId,
      auth.accessToken,
      limit,
    );
    return success(history);
  }, {
    params: t.Object({ projectId: t.String() }),
  });
