import type { ApiResponse, ApiError } from '@shared/types';

export function success<T>(data: T): ApiResponse<T> {
  return { success: true, data, error: null };
}

export function error(code: string, message: string, details?: unknown): ApiError {
  return { success: false, data: null, error: { code, message, details } };
}
