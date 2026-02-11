import { Elysia, t } from 'elysia';
import { authMiddleware, ensureProfileMiddleware } from '../middleware';
import { projectService } from '../services';
import { success } from '../lib/response';

export const projectRoutes = new Elysia({ prefix: '/projects' })
  .use(authMiddleware)
  .use(ensureProfileMiddleware)

  /* List all projects */
  .get('/', async ({ auth }) => {
    const projects = await projectService.listProjects(auth.userId, auth.accessToken);
    return success(projects);
  })

  /* Get single project */
  .get('/:id', async ({ auth, params }) => {
    const project = await projectService.getProject(auth.userId, params.id, auth.accessToken);
    return success(project);
  }, {
    params: t.Object({ id: t.String() }),
  })

  /* Create project */
  .post('/', async ({ auth, body }) => {
    const project = await projectService.createProject(auth.userId, body, auth.accessToken);
    return success(project);
  }, {
    body: t.Object({
      title: t.String({ minLength: 1, maxLength: 100 }),
      description: t.String({ maxLength: 500, default: '' }),
      dialect: t.Union([
        t.Literal('mysql'),
        t.Literal('mariadb'),
        t.Literal('postgresql'),
        t.Literal('sqlite'),
        t.Literal('mssql'),
        t.Literal('oracle'),
      ]),
    }),
  })

  /* Update project */
  .patch('/:id', async ({ auth, params, body }) => {
    const project = await projectService.updateProject(auth.userId, params.id, body, auth.accessToken);
    return success(project);
  }, {
    params: t.Object({ id: t.String() }),
    body: t.Object({
      title: t.Optional(t.String({ minLength: 1, maxLength: 100 })),
      description: t.Optional(t.String({ maxLength: 500 })),
      dialect: t.Optional(t.Union([
        t.Literal('mysql'),
        t.Literal('mariadb'),
        t.Literal('postgresql'),
        t.Literal('sqlite'),
        t.Literal('mssql'),
        t.Literal('oracle'),
      ])),
    }),
  })

  /* Delete project */
  .delete('/:id', async ({ auth, params }) => {
    await projectService.deleteProject(auth.userId, params.id, auth.accessToken);
    return success({ deleted: true });
  }, {
    params: t.Object({ id: t.String() }),
  })

  /* List saved queries */
  .get('/:id/queries', async ({ auth, params }) => {
    const queries = await projectService.listQueries(auth.userId, params.id, auth.accessToken);
    return success(queries);
  }, {
    params: t.Object({ id: t.String() }),
  })

  /* Create saved query */
  .post('/:id/queries', async ({ auth, params, body }) => {
    const query = await projectService.createQuery(auth.userId, {
      projectId: params.id,
      title: body.title,
      sql: body.sql,
    }, auth.accessToken);
    return success(query);
  }, {
    params: t.Object({ id: t.String() }),
    body: t.Object({
      title: t.String({ minLength: 1, maxLength: 200 }),
      sql: t.String({ minLength: 1 }),
    }),
  })

  /* Update saved query */
  .patch('/:id/queries/:queryId', async ({ auth, params, body }) => {
    const query = await projectService.updateQuery(auth.userId, params.id, params.queryId, body, auth.accessToken);
    return success(query);
  }, {
    params: t.Object({ id: t.String(), queryId: t.String() }),
    body: t.Object({
      title: t.Optional(t.String({ minLength: 1, maxLength: 200 })),
      sql: t.Optional(t.String({ minLength: 1 })),
    }),
  })

  /* Delete saved query */
  .delete('/:id/queries/:queryId', async ({ auth, params }) => {
    await projectService.deleteQuery(auth.userId, params.id, params.queryId, auth.accessToken);
    return success({ deleted: true });
  }, {
    params: t.Object({ id: t.String(), queryId: t.String() }),
  });
