import type { RegistrationMode } from './auth';
export type { RegistrationMode };

export interface PlatformFeatures {
  sandbox: boolean;
  playground: boolean;
  classroom: boolean;
  competition: boolean;
}

export interface SmtpSettings {
  host: string;
  port: number;
  secure: boolean;
  user: string;
  password?: string;
  from: string;
}

export interface SystemSettingsDto {
  registrationMode: RegistrationMode;
  enabledFeatures: PlatformFeatures;
  smtpConfig: SmtpSettings | null;
}

export interface PublicSettingsDto {
  registrationMode: RegistrationMode;
  enabledFeatures: PlatformFeatures;
}

export interface SystemNotificationDto {
  id: string;
  type: 'engine_started' | 'engine_stopped' | 'mode_enabled' | 'mode_disabled' | 'system';
  title: string;
  message: string;
  target?: string;
  timestamp: string;
}

