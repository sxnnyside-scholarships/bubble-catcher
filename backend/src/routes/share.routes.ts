import type { CreatePlaygroundSharePayload } from '@shared/types';
import { Elysia, t } from 'elysia';
import { success } from '../lib/response';
import { authMiddleware } from '../middleware';
import { playgroundShareService } from '../services';

export const shareRoutes = new Elysia({ prefix: '/playground/shares' })
  .use(authMiddleware)

  .post(
    '/',
    async ({ auth, body }) => {
      const share = await playgroundShareService.createShare(auth.userId, body as CreatePlaygroundSharePayload);
      return success(share);
    },
    {
      body: t.Object({
        title: t.String({ minLength: 1, maxLength: 200 }),
        notes: t.Optional(t.String()),
        sql: t.String({ minLength: 1 }),
        dialect: t.Union([
          t.Literal('mysql'),
          t.Literal('mariadb'),
          t.Literal('postgresql'),
          t.Literal('sqlite'),
          t.Literal('libsql'),
          t.Literal('mssql'),
        ]),
        projectId: t.Optional(t.String()),
      }),
    },
  )

  .get(
    '/:id',
    async ({ params }) => {
      const share = await playgroundShareService.getShare(params.id);
      return success(share);
    },
    {
      params: t.Object({ id: t.String() }),
    },
  );
