interface EnvironmentConfig {
  supabaseUrl: string;
  supabaseAnonKey: string;
  supabaseServiceRoleKey: string;
  port: number;
  /** Validated list of allowed CORS origins */
  corsOrigins: string[];
  sandboxTimeoutMs: number;
  sandboxMemoryLimit: string;
  sandboxCpuLimit: number;
  /** Max requests per IP per minute (global) */
  ipRateLimitPerMinute: number;
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

function loadConfig(): EnvironmentConfig {
  return {
    supabaseUrl: requireEnv('SUPABASE_URL'),
    supabaseAnonKey: requireEnv('SUPABASE_ANON_KEY'),
    supabaseServiceRoleKey: requireEnv('SUPABASE_SERVICE_ROLE_KEY'),
    port: parseInt(process.env['PORT'] ?? '3001', 10),
    corsOrigins: parseCorsOrigins(process.env['CORS_ORIGIN'] ?? 'http://localhost:5173'),
    sandboxTimeoutMs: parseInt(process.env['SANDBOX_TIMEOUT_MS'] ?? '10000', 10),
    sandboxMemoryLimit: process.env['SANDBOX_MEMORY_LIMIT'] ?? '128m',
    sandboxCpuLimit: parseFloat(process.env['SANDBOX_CPU_LIMIT'] ?? '0.5'),
    ipRateLimitPerMinute: parseInt(process.env['IP_RATE_LIMIT_PER_MINUTE'] ?? '60', 10),
    nodeEnv: (process.env['NODE_ENV'] as EnvironmentConfig['nodeEnv']) ?? 'development',
  };
}

export const config = loadConfig();
