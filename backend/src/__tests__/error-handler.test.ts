import { describe, expect, test } from 'bun:test';
import { Elysia, t } from 'elysia';
import { AppError } from '../lib/errors';
import { errorHandler } from '../middleware/error-handler';

/**
 * Regression test: in the installed Elysia version (1.4.x), a thrown
 * ValidationError reports `name: 'Error'` — only `constructor.name` is
 * actually 'ValidationError'. A `error.name === 'ValidationError'` check
 * (the original implementation) silently never matches, so every
 * validation failure on every route falls through to the generic 500
 * branch instead of 400. Found by manually testing an invalid enum value
 * against a real endpoint; this test locks the fix in.
 */
describe('errorHandler', () => {
  const app = new Elysia()
    .use(errorHandler)
    .post('/echo', ({ body }) => body, { body: t.Object({ x: t.Union([t.Literal('a'), t.Literal('b')]) }) })
    .get('/boom', () => {
      throw AppError.notFound('NOT_FOUND');
    })
    .get('/crash', () => {
      throw new Error('unexpected');
    });

  test('validation failures return 400, not 500', async () => {
    const res = await app.handle(
      new Request('http://localhost/echo', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ x: 'z' }),
      }),
    );
    expect(res.status).toBe(400);
    const body = (await res.json()) as { error: { code: string } };
    expect(body.error.code).toBe('VALIDATION_ERROR');
  });

  test('AppError maps to its own status code', async () => {
    const res = await app.handle(new Request('http://localhost/boom'));
    expect(res.status).toBe(404);
    const body = (await res.json()) as { error: { code: string } };
    expect(body.error.code).toBe('NOT_FOUND');
  });

  test('unexpected errors map to 500 without leaking the message', async () => {
    const res = await app.handle(new Request('http://localhost/crash'));
    expect(res.status).toBe(500);
    const body = (await res.json()) as { error: { code: string; message: string } };
    expect(body.error.code).toBe('INTERNAL_ERROR');
    expect(body.error.message).not.toContain('unexpected');
  });
});
