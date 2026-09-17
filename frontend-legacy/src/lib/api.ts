import { PUBLIC_API_URL } from '$env/static/public';
import { supabase } from './supabase';
import { session, sessionLoaded } from './stores';
import { goto } from '$app/navigation';
import { get } from 'svelte/store';
import { resolveErrorCode } from './i18n';
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
  /* Block until initial session restoration is complete */
  if (!get(sessionLoaded)) {
    await new Promise<void>((resolve) => {
      const unsub = sessionLoaded.subscribe((loaded) => {
        if (loaded) { unsub(); resolve(); }
      });
    });
  }

  const currentSession = get(session);
  if (!currentSession) {
    throw new Error('Not authenticated');
  }

  const token = currentSession.access_token;
  if (!token || token.split('.').length !== 3) {
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
  const headers = await getAuthHeaders();
  const url = `${PUBLIC_API_URL}${path}`;

  const response = await fetch(url, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
    credentials: 'include',
  });

  /* Handle 401 globally — expired/invalid token */
  if (response.status === 401) {
    await supabase.auth.signOut();
    session.set(null);
    goto('/');
    throw new Error('Session expired — please sign in again');
  }

  if (!response.ok) {
    const text = await response.text();
    let errorData;
    try {
      errorData = JSON.parse(text);
    } catch {
      throw new Error(`HTTP ${response.status}: ${text || response.statusText}`);
    }
    /* If the response follows our ApiError shape, resolve error code to localized message */
    if (errorData && typeof errorData === 'object' && 'success' in errorData && errorData.success === false) {
      const apiErr = errorData as ApiResult<T>;
      if (apiErr.error?.code) {
        apiErr.error.message = resolveErrorCode(apiErr.error.code);
      }
      return apiErr;
    }
    throw new Error(errorData.error?.message || `HTTP ${response.status}`);
  }

  return response.json() as Promise<ApiResult<T>>;
}

export const api = {
  get: <T>(path: string) => request<T>('GET', path),
  post: <T>(path: string, body: unknown) => request<T>('POST', path, body),
  patch: <T>(path: string, body: unknown) => request<T>('PATCH', path, body),
  delete: <T>(path: string) => request<T>('DELETE', path),
};
