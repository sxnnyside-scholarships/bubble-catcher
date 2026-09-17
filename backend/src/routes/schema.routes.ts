import { COLUMN_TYPES } from '@shared/types';
import { Elysia, t } from 'elysia';
import { success } from '../lib/response';
import { authMiddleware } from '../middleware';
import { schemaService } from '../services/schema.service';

const columnSchema = t.Object({
  name: t.String({ minLength: 1, maxLength: 63 }),
  type: t.Union(COLUMN_TYPES.map((type) => t.Literal(type))),
  primaryKey: t.Boolean(),
  nullable: t.Boolean(),
  references: t.Union([t.Object({ table: t.String({ minLength: 1 }), column: t.String({ minLength: 1 }) }), t.Null()]),
});

/** Sandbox schema builder — lets a user visually shape and seed the persistent-looking schema that
 * Playground executions replay before each query (see execution.service.ts + schema.service.ts). */
export const schemaRoutes = new Elysia({ prefix: '/projects' })
  .use(authMiddleware)

  .get(
    '/:id/schema',
    async ({ auth, params }) => {
      const schema = await schemaService.getSchema(auth.userId, params.id);
      return success(schema);
    },
    { params: t.Object({ id: t.String() }) },
  )

  .post(
    '/:id/schema/tables',
    async ({ auth, params, body }) => {
      const schema = await schemaService.createTable(auth.userId, params.id, body);
      return success(schema);
    },
    {
      params: t.Object({ id: t.String() }),
      body: t.Object({
        name: t.String({ minLength: 1, maxLength: 63 }),
        columns: t.Array(columnSchema, { minItems: 1 }),
      }),
    },
  )

  .delete(
    '/:id/schema/tables/:tableName',
    async ({ auth, params }) => {
      const schema = await schemaService.dropTable(auth.userId, params.id, params.tableName);
      return success(schema);
    },
    { params: t.Object({ id: t.String(), tableName: t.String() }) },
  )

  .post(
    '/:id/schema/tables/:tableName/seed',
    async ({ auth, params, body }) => {
      const result = await schemaService.seedTable(auth.userId, params.id, params.tableName, body.count);
      return success(result);
    },
    {
      params: t.Object({ id: t.String(), tableName: t.String() }),
      body: t.Object({ count: t.Number({ minimum: 1, maximum: 5000 }) }),
    },
  );
