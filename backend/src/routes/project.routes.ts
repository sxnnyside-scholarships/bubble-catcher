import { Elysia, t } from 'elysia';
import { parsePagination } from '../lib/pagination';
import { success } from '../lib/response';
import { authMiddleware } from '../middleware';
import { projectService } from '../services';

export const projectRoutes = new Elysia({ prefix: '/projects' })
  .use(authMiddleware)

  .get('/', async ({ auth, query }) => {
    const projects = await projectService.listProjects(auth.userId, parsePagination(query));
    return success(projects);
  })

  .get(
    '/:id',
    async ({ auth, params }) => {
      const project = await projectService.getProject(auth.userId, params.id);
      return success(project);
    },
    {
      params: t.Object({ id: t.String() }),
    },
  )

  .post(
    '/',
    async ({ auth, body }) => {
      const project = await projectService.createProject(auth.userId, body);
      return success(project);
    },
    {
      body: t.Object({
        title: t.String({ minLength: 1, maxLength: 100 }),
        description: t.String({ maxLength: 500, default: '' }),
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
  )

  .patch(
    '/:id',
    async ({ auth, params, body }) => {
      const project = await projectService.updateProject(auth.userId, params.id, body);
      return success(project);
    },
    {
      params: t.Object({ id: t.String() }),
      body: t.Object({
        title: t.Optional(t.String({ minLength: 1, maxLength: 100 })),
        description: t.Optional(t.String({ maxLength: 500 })),
        dialect: t.Optional(
          t.Union([
            t.Literal('mysql'),
            t.Literal('mariadb'),
            t.Literal('postgresql'),
            t.Literal('sqlite'),
            t.Literal('libsql'),
            t.Literal('mssql'),
          ]),
        ),
      }),
    },
  )

  .delete(
    '/:id',
    async ({ auth, params }) => {
      await projectService.deleteProject(auth.userId, params.id);
      return success({ deleted: true });
    },
    {
      params: t.Object({ id: t.String() }),
    },
  )

  .get(
    '/:id/queries',
    async ({ auth, params }) => {
      const queries = await projectService.listQueries(auth.userId, params.id);
      return success(queries);
    },
    {
      params: t.Object({ id: t.String() }),
    },
  )

  .get(
    '/:id/queries/recent',
    async ({ auth, params, query }) => {
      const limit = query['limit'] ? parseInt(query['limit'] as string, 10) : 5;
      const queries = await projectService.recentQueries(auth.userId, params.id, limit);
      return success(queries);
    },
    {
      params: t.Object({ id: t.String() }),
    },
  )

  .post(
    '/:id/queries',
    async ({ auth, params, body }) => {
      const query = await projectService.createQuery(auth.userId, {
        projectId: params.id,
        title: body.title,
        sql: body.sql,
      });
      return success(query);
    },
    {
      params: t.Object({ id: t.String() }),
      body: t.Object({
        title: t.String({ minLength: 1, maxLength: 200 }),
        sql: t.String({ minLength: 1 }),
      }),
    },
  )

  .patch(
    '/:id/queries/:queryId',
    async ({ auth, params, body }) => {
      const query = await projectService.updateQuery(auth.userId, params.id, params.queryId, body);
      return success(query);
    },
    {
      params: t.Object({ id: t.String(), queryId: t.String() }),
      body: t.Object({
        title: t.Optional(t.String({ minLength: 1, maxLength: 200 })),
        sql: t.Optional(t.String({ minLength: 1 })),
      }),
    },
  )

  .delete(
    '/:id/queries/:queryId',
    async ({ auth, params }) => {
      await projectService.deleteQuery(auth.userId, params.id, params.queryId);
      return success({ deleted: true });
    },
    {
      params: t.Object({ id: t.String(), queryId: t.String() }),
    },
  );
