import type { ApiResult } from '@shared/types';

const API_URL = import.meta.env.VITE_API_URL || '/api/v1';

/** Unauthenticated POST — used by the auth store for /auth/signup and /auth/login. */
export async function postJson<T>(path: string, body: unknown): Promise<ApiResult<T>> {
  const response = await fetch(`${API_URL}${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });

  return response.json() as Promise<ApiResult<T>>;
}

/** GET request — pass accessToken for authenticated endpoints, or omit for public endpoints. */
export async function getJson<T>(path: string, accessToken?: string): Promise<ApiResult<T>> {
  const headers: Record<string, string> = {};
  if (accessToken) {
    headers.Authorization = `Bearer ${accessToken}`;
  }
  const response = await fetch(`${API_URL}${path}`, {
    headers,
  });

  return response.json() as Promise<ApiResult<T>>;
}

/** Authenticated POST/PATCH/DELETE — used by the Playground (projects, execution). */
export async function authJson<T>(
  method: 'POST' | 'PATCH' | 'DELETE',
  path: string,
  accessToken: string,
  body?: unknown,
): Promise<ApiResult<T>> {
  const response = await fetch(`${API_URL}${path}`, {
    method,
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${accessToken}` },
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });

  return response.json() as Promise<ApiResult<T>>;
}
