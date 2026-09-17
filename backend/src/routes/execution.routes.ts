import { Elysia, t } from 'elysia';
import { config } from '../config';
import { parsePagination } from '../lib/pagination';
import { success } from '../lib/response';
import { authMiddleware } from '../middleware';
import { executionService } from '../services';

export const executionRoutes = new Elysia({ prefix: '/execution' })
  .use(authMiddleware)

  /* Which sandbox dialects this instance has enabled — frontend filters its dialect picker against this */
  .get('/dialects', () => success({ enabled: config.enabledDialects }))

  .post(
    '/run',
    async ({ auth, body }) => {
      const result = await executionService.execute(auth.userId, body.projectId, body.sql, body.dialect);
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
        projectId: t.String({ minLength: 1 }),
      }),
    },
  )

  .post(
    '/explain',
    async ({ auth, body }) => {
      const result = await executionService.explain(auth.userId, body.projectId, body.sql, body.dialect);
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
        projectId: t.String({ minLength: 1 }),
      }),
    },
  )

  .get(
    '/history/:projectId',
    async ({ params, query }) => {
      const history = await executionService.getHistory(params.projectId, parsePagination(query));
      return success(history);
    },
    {
      params: t.Object({ projectId: t.String() }),
    },
  );
