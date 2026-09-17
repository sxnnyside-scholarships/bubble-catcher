import { DEFAULT_MAX_PROJECTS_PER_USER, SUPPORTED_DIALECTS } from '@shared/types';

interface EnvironmentConfig {
  databaseUrl: string;
  jwtSecret: string;
  /** Access token TTL — short-lived, verified on every request */
  accessTokenExpiresIn: string;
  /** Refresh token TTL in days — long-lived, single-use (rotated), revocable */
  refreshTokenExpiresInDays: number;
  passwordResetTokenExpiresInMinutes: number;
  emailVerificationTokenExpiresInHours: number;
  port: number;
  /** Validated list of allowed CORS origins */
  corsOrigins: string[];
  sandboxTimeoutMs: number;
  sandboxMemoryLimit: string;
  /** Memory limit for the long-lived, admin-started server containers (postgres/mysql/mariadb/mssql) —
   * higher than the per-query ephemeral limit since one instance now serves every project for that engine. */
  sandboxPersistentMemoryLimit: string;
  sandboxCpuLimit: number;
  /** Sandbox image tag to run (default: the last version built by docker/build-images.sh, never `:latest` — see SANDBOX_IMAGE_TAG in .env.example for why) */
  sandboxImageTag: string;
  /** Max requests per IP per minute (global) */
  ipRateLimitPerMinute: number;
  /** Optional Redis backend for rate limiting across multiple backend replicas. Falls back to in-memory when unset. */
  redisUrl: string | null;
  /** SMTP config for password-reset/verification emails. If unset, lib/mailer.ts falls back to logging the link instead of sending it (fine for local dev, not for a public self-hosted instance). */
  smtp: {
    host: string;
    port: number;
    secure: boolean;
    user: string | null;
    password: string | null;
    from: string;
  } | null;
  /** Base URL of the frontend, used to build links inside emails (e.g. `${frontendUrl}/reset-password?token=...`) */
  frontendUrl: string;
  /** Instance-wide limits — no plan tiers, single self-hosted instance */
  maxProjectsPerUser: number;
  maxQueryLength: number;
  maxExecutionsPerMinute: number;
  maxAnalysisPerMinute: number;
  /** Dialects the operator has enabled for this instance */
  enabledDialects: string[];
  nodeEnv: 'development' | 'production';
}

function requireEnv(key: string): string {
  const value = process.env[key];
  if (!value) {
    throw new Error(`Missing required environment variable: ${key}`);
  }
  return value;
}

/** Parse and validate CORS origins from comma-separated env var */
function parseCorsOrigins(raw: string): string[] {
  const origins = raw
    .split(',')
    .map((o) => o.trim())
    .filter(Boolean);

  for (const origin of origins) {
    if (origin === '*') {
      throw new Error('CORS_ORIGIN must not be wildcard (*). Use explicit origins.');
    }
    if (!origin.startsWith('http://') && !origin.startsWith('https://')) {
      throw new Error(`Invalid CORS origin: ${origin}. Must start with http:// or https://`);
    }
  }

  if (origins.length === 0) {
    throw new Error('CORS_ORIGIN must contain at least one valid origin.');
  }

  return origins;
}

/** Parse and validate the operator-configured list of enabled sandbox dialects */
function parseEnabledDialects(raw: string): string[] {
  const dialects = raw
    .split(',')
    .map((d) => d.trim().toLowerCase())
    .filter(Boolean);

  for (const dialect of dialects) {
    if (!(SUPPORTED_DIALECTS as readonly string[]).includes(dialect)) {
      throw new Error(
        `Invalid SANDBOX_ENABLED_DIALECTS entry: ${dialect}. Must be one of: ${SUPPORTED_DIALECTS.join(', ')}`,
      );
    }
  }

  if (dialects.length === 0) {
    throw new Error('SANDBOX_ENABLED_DIALECTS must contain at least one dialect.');
  }

  return dialects;
}

function loadConfig(): EnvironmentConfig {
  const jwtSecret = requireEnv('JWT_SECRET');
  if (jwtSecret.length < 32) {
    throw new Error('JWT_SECRET must be at least 32 characters long.');
  }

  const nodeEnv = (process.env['NODE_ENV'] as EnvironmentConfig['nodeEnv']) ?? 'development';

  /* Avoids the silent-localhost-fallback footgun in production. */
  if (nodeEnv === 'production' && !process.env['CORS_ORIGIN']) {
    throw new Error('CORS_ORIGIN must be set explicitly in production (no localhost fallback).');
  }

  const smtpHost = process.env['SMTP_HOST']?.trim();
  const smtp = smtpHost
    ? {
        host: smtpHost,
        port: parseInt(process.env['SMTP_PORT'] ?? '587', 10),
        secure: process.env['SMTP_SECURE'] === 'true',
        user: process.env['SMTP_USER']?.trim() || null,
        password: process.env['SMTP_PASSWORD']?.trim() || null,
        from: process.env['SMTP_FROM']?.trim() || 'Bubble Catcher <no-reply@localhost>',
      }
    : null;

  if (nodeEnv === 'production' && !smtp) {
    console.warn(
      '[config] WARNING: SMTP_HOST is not set — password-reset and email-verification links will only appear in server logs, not be emailed to users. Set SMTP_HOST/SMTP_USER/SMTP_PASSWORD/SMTP_FROM if this instance has real end users.',
    );
  }

  return {
    databaseUrl: requireEnv('DATABASE_URL'),
    jwtSecret,
    accessTokenExpiresIn: process.env['ACCESS_TOKEN_EXPIRES_IN'] ?? '15m',
    refreshTokenExpiresInDays: parseInt(process.env['REFRESH_TOKEN_EXPIRES_IN_DAYS'] ?? '30', 10),
    passwordResetTokenExpiresInMinutes: parseInt(process.env['PASSWORD_RESET_TOKEN_EXPIRES_IN_MINUTES'] ?? '30', 10),
    emailVerificationTokenExpiresInHours: parseInt(
      process.env['EMAIL_VERIFICATION_TOKEN_EXPIRES_IN_HOURS'] ?? '24',
      10,
    ),
    port: parseInt(process.env['PORT'] ?? '3001', 10),
    corsOrigins: parseCorsOrigins(process.env['CORS_ORIGIN'] ?? 'http://localhost:5173'),
    sandboxTimeoutMs: parseInt(process.env['SANDBOX_TIMEOUT_MS'] ?? '10000', 10),
    sandboxMemoryLimit: process.env['SANDBOX_MEMORY_LIMIT'] ?? '128m',
    sandboxPersistentMemoryLimit: process.env['SANDBOX_PERSISTENT_MEMORY_LIMIT'] ?? '512m',
    sandboxCpuLimit: parseFloat(process.env['SANDBOX_CPU_LIMIT'] ?? '0.5'),
    sandboxImageTag: process.env['SANDBOX_IMAGE_TAG'] ?? '1.0.0',
    ipRateLimitPerMinute: parseInt(process.env['IP_RATE_LIMIT_PER_MINUTE'] ?? '60', 10),
    redisUrl: process.env['REDIS_URL']?.trim() || null,
    smtp,
    frontendUrl: process.env['FRONTEND_URL'] ?? 'http://localhost:5173',
    maxProjectsPerUser: parseInt(process.env['MAX_PROJECTS_PER_USER'] ?? String(DEFAULT_MAX_PROJECTS_PER_USER), 10),
    maxQueryLength: parseInt(process.env['MAX_QUERY_LENGTH'] ?? '20000', 10),
    maxExecutionsPerMinute: parseInt(process.env['MAX_EXECUTIONS_PER_MINUTE'] ?? '30', 10),
    maxAnalysisPerMinute: parseInt(process.env['MAX_ANALYSIS_PER_MINUTE'] ?? '60', 10),
    enabledDialects: parseEnabledDialects(process.env['SANDBOX_ENABLED_DIALECTS'] ?? 'sqlite,postgresql'),
    nodeEnv,
  };
}

export const config = loadConfig();
