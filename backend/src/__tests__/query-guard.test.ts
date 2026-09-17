import { describe, expect, test } from 'bun:test';
import { guardQuery } from '../lib/query-guard';

describe('guardQuery', () => {
  test('blocks SELECT * without WHERE or LIMIT', () => {
    const result = guardQuery('SELECT * FROM users', 'sqlite');
    expect(result.blocked).toBe(true);
  });

  test('allows SELECT * with LIMIT', () => {
    const result = guardQuery('SELECT * FROM users LIMIT 10', 'sqlite');
    expect(result.blocked).toBe(false);
  });

  test('allows SELECT * with WHERE', () => {
    const result = guardQuery('SELECT * FROM users WHERE id = 1', 'sqlite');
    expect(result.blocked).toBe(false);
  });

  test('blocks recursive CTEs', () => {
    const result = guardQuery(
      'WITH RECURSIVE cte AS (SELECT 1 AS n UNION ALL SELECT n+1 FROM cte WHERE n < 100) SELECT * FROM cte',
      'sqlite',
    );
    expect(result.blocked).toBe(true);
    expect(result.reason).toMatch(/recursive/i);
  });

  test('allows a normal bounded query', () => {
    const result = guardQuery('SELECT id, name FROM users WHERE id = 1', 'sqlite');
    expect(result.blocked).toBe(false);
  });

  test('blocks unparseable SQL (fail-safe)', () => {
    const result = guardQuery('SELECT FROM WHERE', 'sqlite');
    expect(result.blocked).toBe(true);
  });

  test('blocks generate_series without LIMIT', () => {
    const result = guardQuery('SELECT * FROM generate_series(1, 1000000)', 'postgresql');
    expect(result.blocked).toBe(true);
  });

  test('allows generate_series with LIMIT', () => {
    const result = guardQuery('SELECT * FROM generate_series(1, 1000000) LIMIT 10', 'postgresql');
    expect(result.blocked).toBe(false);
  });
});
