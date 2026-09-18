import type { UserProfile } from './api';

/** Authentication and user administration payload and response types. */

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

/** Response payload for active user session. */
export interface AuthSession extends AuthTokens {
  pending?: false;
  user: UserProfile;
}

/** Response payload when registration requires administrator approval. */
export interface PendingApprovalResponse {
  pending: true;
}

export type SignupResponse = AuthSession | PendingApprovalResponse;

/** Response payload for refreshed token pair. */
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

/** Payload for administrator-created user account. */
export interface AdminCreateUserPayload {
  name: string;
  email: string;
  password: string;
  role?: 'admin' | 'user';
}

export type RegistrationMode = 'open' | 'invite_only' | 'approval_required';

/** Registration settings configuration. */
export interface RegistrationSettings {
  registrationMode: RegistrationMode;
}
