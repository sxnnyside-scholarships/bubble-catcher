export interface ApiResponse<T> {
  success: boolean;
  data: T;
  error: null;
}

export interface ApiError {
  success: false;
  data: null;
  error: {
    code: string;
    message: string;
    details?: unknown;
  };
}

export type ApiResult<T> = ApiResponse<T> | ApiError;

export interface PaginatedResponse<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
  hasMore: boolean;
}

export interface UserProfile {
  id: string;
  email: string;
  plan: 'free' | 'premium' | 'enterprise';
  preferredTheme: 'colorful' | 'light' | 'dark';
  preferredLocale: 'en' | 'es';
  createdAt: string;
}

export interface UpdateUserPreferencesPayload {
  preferredTheme?: 'colorful' | 'light' | 'dark';
  preferredLocale?: 'en' | 'es';
}
