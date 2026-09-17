import type { UserProfile } from './api';

/* Mirrors the Elysia `t.Object` schemas in auth/user/admin.routes.ts — kept in sync by hand. */

export interface SignupPayload {
  name: string;
  email: string;
  password: string;
}

export interface LoginPayload {
  email: string;
  password: string;
}

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
}

/** Response of `/auth/signup` and `/auth/login` */
export interface AuthSession extends AuthTokens {
  pending?: false;
  user: UserProfile;
}

/** Response of `/auth/signup` when the instance requires admin approval — no tokens are issued yet. */
export interface PendingApprovalResponse {
  pending: true;
}

export type SignupResponse = AuthSession | PendingApprovalResponse;

/** Response of `/auth/refresh` — no `user`, just a rotated token pair */
export type RefreshResponse = AuthTokens;

export interface RefreshTokenPayload {
  refreshToken: string;
}

export interface LogoutPayload {
  refreshToken: string;
}

export interface ForgotPasswordPayload {
  email: string;
}

export interface ResetPasswordPayload {
  token: string;
  newPassword: string;
}

export interface VerifyEmailPayload {
  token: string;
}

/** `PATCH /user/password` */
export interface ChangePasswordPayload {
  currentPassword: string;
  newPassword: string;
}

/** `PATCH /user/email` */
export interface ChangeEmailPayload {
  currentPassword: string;
  newEmail: string;
}

/** `DELETE /user/account` */
export interface DeactivateAccountPayload {
  password: string;
}

/** `PATCH /admin/users/:id` */
export interface AdminUpdateUserPayload {
  role?: 'admin' | 'user';
  status?: 'active' | 'suspended';
}

/** `POST /admin/users` — admin-initiated account creation, bypasses registration governance and email verification. */
export interface AdminCreateUserPayload {
  name: string;
  email: string;
  password: string;
  role?: 'admin' | 'user';
}

export type RegistrationMode = 'open' | 'invite_only' | 'approval_required';

/** `GET/PATCH /admin/settings` */
export interface RegistrationSettings {
  registrationMode: RegistrationMode;
}
