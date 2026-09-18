import type { ChallengeDifficulty, SupportedDialect } from '@shared/types';
import { Elysia, t } from 'elysia';
import { success } from '../lib/response';
import { authMiddleware } from '../middleware';
import { competitionService } from '../services/competition.service';

export const competitionRoutes = new Elysia({ prefix: '/competition' })
  .use(authMiddleware)

  /* ── List Challenges ──────────────────────────────────── */
  .get('/challenges', async ({ auth }) => {
    const challenges = await competitionService.getChallenges(auth.userId);
    return success(challenges);
  })

  /* ── Single Challenge ─────────────────────────────────── */
  .get(
    '/challenges/:id',
    async ({ auth, params }) => {
      const challenge = await competitionService.getChallengeById(params.id, auth.userId);
      return success(challenge);
    },
    {
      params: t.Object({
        id: t.String(),
      }),
    },
  )

  /* ── Challenge Leaderboard ────────────────────────────── */
  .get(
    '/challenges/:id/leaderboard',
    async ({ params }) => {
      const leaderboard = await competitionService.getLeaderboard(params.id);
      return success(leaderboard);
    },
    {
      params: t.Object({
        id: t.String(),
      }),
    },
  )

  /* ── Test / Benchmark Query (Dry Run) ─────────────────── */
  .post(
    '/challenges/:id/test',
    async ({ auth, params, body }) => {
      const evalResult = await competitionService.testQuery(auth.userId, params.id, body.sql);
      return success(evalResult);
    },
    {
      params: t.Object({
        id: t.String(),
      }),
      body: t.Object({
        sql: t.String({ minLength: 1, maxLength: 50_000 }),
      }),
    },
  )

  /* ── Submit to Leaderboard ────────────────────────────── */
  .post(
    '/challenges/:id/submit',
    async ({ auth, params, body }) => {
      const evalResult = await competitionService.submitQuery(auth.userId, params.id, body.sql);
      return success(evalResult);
    },
    {
      params: t.Object({
        id: t.String(),
      }),
      body: t.Object({
        sql: t.String({ minLength: 1, maxLength: 50_000 }),
      }),
    },
  )

  /* ── Create Challenge (Teachers / Admins) ─────────────── */
  .post(
    '/challenges',
    async ({ auth, body }) => {
      const challenge = await competitionService.createChallenge(auth.userId, {
        title: body.title,
        description: body.description,
        dialect: body.dialect as SupportedDialect,
        difficulty: body.difficulty as ChallengeDifficulty,
        initialSchemaSql: body.initialSchemaSql,
        referenceQuerySql: body.referenceQuerySql,
        targetExecutionTimeMs: body.targetExecutionTimeMs ?? 10.0,
        targetBuffersRead: body.targetBuffersRead ?? 50,
      });
      return success(challenge);
    },
    {
      body: t.Object({
        title: t.String({ minLength: 3, maxLength: 150 }),
        description: t.String({ minLength: 5, maxLength: 2000 }),
        dialect: t.Union([
          t.Literal('postgres'),
          t.Literal('mysql'),
          t.Literal('sqlite'),
          t.Literal('mariadb'),
          t.Literal('turso'),
          t.Literal('mssql'),
        ]),
        difficulty: t.Union([t.Literal('easy'), t.Literal('medium'), t.Literal('hard')]),
        initialSchemaSql: t.String({ minLength: 10 }),
        referenceQuerySql: t.String({ minLength: 5 }),
        targetExecutionTimeMs: t.Optional(t.Number({ minimum: 0.1 })),
        targetBuffersRead: t.Optional(t.Integer({ minimum: 1 })),
      }),
    },
  );
