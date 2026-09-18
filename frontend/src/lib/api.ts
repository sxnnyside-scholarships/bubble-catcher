import type { ApiResult } from '@shared/types';

const API_URL = import.meta.env.VITE_API_URL || '/api/v1';

/** Sends an unauthenticated JSON POST request. */
export async function postJson<T>(path: string, body: unknown): Promise<ApiResult<T>> {
  const response = await fetch(`${API_URL}${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });

  return response.json() as Promise<ApiResult<T>>;
}

/** Sends a JSON GET request with optional authorization bearer token. */
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

/** Sends an authenticated HTTP request with JSON payload. */
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

export async function patchJson<T>(path: string, accessToken: string, body?: unknown): Promise<ApiResult<T>> {
  return authJson<T>('PATCH', path, accessToken, body);
}
