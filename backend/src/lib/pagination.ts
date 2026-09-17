import type { PaginatedResponse } from '@shared/types';

const DEFAULT_PAGE_SIZE = 20;
const MAX_PAGE_SIZE = 100;

export interface PaginationParams {
  page: number;
  pageSize: number;
  offset: number;
}

/** Parses `page`/`pageSize` query params with sane bounds — never trust raw query input. */
export function parsePagination(query: Record<string, string | undefined>): PaginationParams {
  const page = Math.max(1, parseInt(query['page'] ?? '1', 10) || 1);
  const rawPageSize = parseInt(query['pageSize'] ?? String(DEFAULT_PAGE_SIZE), 10) || DEFAULT_PAGE_SIZE;
  const pageSize = Math.min(MAX_PAGE_SIZE, Math.max(1, rawPageSize));
  return { page, pageSize, offset: (page - 1) * pageSize };
}

export function toPaginatedResponse<T>(
  items: T[],
  total: number,
  { page, pageSize }: PaginationParams,
): PaginatedResponse<T> {
  return {
    items,
    total,
    page,
    pageSize,
    hasMore: page * pageSize < total,
  };
}
