import { PUBLIC_API_URL } from '$env/static/public';
import { supabase } from './supabase';
import type { ApiResult } from '$shared/types';

if (!PUBLIC_API_URL) {
  throw new Error(
    'Missing PUBLIC_API_URL environment variable. Please ensure it is set in your .env file.'
  );
}

if (!PUBLIC_API_URL.startsWith('http')) {
  throw new Error(
    `Invalid PUBLIC_API_URL: "${PUBLIC_API_URL}". Must be a valid HTTP/HTTPS URL.`
  );
}

async function getAuthHeaders(): Promise<HeadersInit> {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session?.access_token) {
    throw new Error('Not authenticated');
  }

  const token = session.access_token;
  // Defensive: validate JWT structure before sending to backend
  if (token.split('.').length !== 3) {
    throw new Error('Invalid session token — please sign in again');
  }

  return {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${token}`,
  };
}

async function request<T>(
  method: string,
  path: string,
  body?: unknown,
): Promise<ApiResult<T>> {
  try {
    const headers = await getAuthHeaders();
    const url = `${PUBLIC_API_URL}${path}`;

    const response = await fetch(url, {
      method,
      headers,
      body: body ? JSON.stringify(body) : undefined,
      credentials: 'include',
    });

    if (!response.ok) {
      const text = await response.text();
      let errorData;
      try {
        errorData = JSON.parse(text);
      } catch {
        throw new Error(`HTTP ${response.status}: ${text || response.statusText}`);
      }
      throw new Error(errorData.error?.message || `HTTP ${response.status}`);
    }

    return response.json() as Promise<ApiResult<T>>;
  } catch (error) {
    console.error('[API Error]', error);
    throw error;
  }
}

export const api = {
  get: <T>(path: string) => request<T>('GET', path),
  post: <T>(path: string, body: unknown) => request<T>('POST', path, body),
  patch: <T>(path: string, body: unknown) => request<T>('PATCH', path, body),
  delete: <T>(path: string) => request<T>('DELETE', path),
};
