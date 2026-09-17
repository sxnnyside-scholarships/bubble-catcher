export interface ApiResponse<T> {
  success: true;
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
  displayName: string | null;
  role: 'admin' | 'user';
  status: 'active' | 'suspended' | 'pending_approval';
  isOwner: boolean;
  emailVerified: boolean;
  preferredTheme: 'colorful' | 'light' | 'dark';
  preferredLocale: 'en' | 'es';
  createdAt: string;
}

export interface UpdateUserPreferencesPayload {
  preferredTheme?: 'colorful' | 'light' | 'dark';
  preferredLocale?: 'en' | 'es';
}
