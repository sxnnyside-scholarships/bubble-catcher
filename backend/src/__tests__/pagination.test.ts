import { describe, expect, test } from 'bun:test';
import { parsePagination, toPaginatedResponse } from '../lib/pagination';

describe('parsePagination', () => {
  test('defaults to page 1, pageSize 20', () => {
    expect(parsePagination({})).toEqual({ page: 1, pageSize: 20, offset: 0 });
  });

  test('computes offset correctly', () => {
    expect(parsePagination({ page: '3', pageSize: '10' })).toEqual({ page: 3, pageSize: 10, offset: 20 });
  });

  test('clamps pageSize to the max (100)', () => {
    expect(parsePagination({ pageSize: '9999' }).pageSize).toBe(100);
  });

  test('rejects page < 1', () => {
    expect(parsePagination({ page: '0' }).page).toBe(1);
    expect(parsePagination({ page: '-5' }).page).toBe(1);
  });

  test('ignores garbage input instead of throwing', () => {
    expect(parsePagination({ page: 'not-a-number', pageSize: 'nope' })).toEqual({ page: 1, pageSize: 20, offset: 0 });
  });
});

describe('toPaginatedResponse', () => {
  test('computes hasMore correctly', () => {
    const result = toPaginatedResponse([1, 2, 3], 10, { page: 1, pageSize: 3, offset: 0 });
    expect(result.hasMore).toBe(true);
  });

  test('hasMore is false on the last page', () => {
    const result = toPaginatedResponse([1, 2], 8, { page: 3, pageSize: 3, offset: 6 });
    expect(result.hasMore).toBe(false);
  });
});
