interface EnvironmentConfig {
  supabaseUrl: string;
  supabaseAnonKey: string;
  supabaseServiceRoleKey: string;
  port: number;
  corsOrigin: string;
  sandboxTimeoutMs: number;
  sandboxMemoryLimit: string;
  sandboxCpuLimit: number;
  nodeEnv: 'development' | 'production';
}

function requireEnv(key: string): string {
  const value = process.env[key];
  if (!value) {
    throw new Error(`Missing required environment variable: ${key}`);
  }
  return value;
}

function loadConfig(): EnvironmentConfig {
  return {
    supabaseUrl: requireEnv('SUPABASE_URL'),
    supabaseAnonKey: requireEnv('SUPABASE_ANON_KEY'),
    supabaseServiceRoleKey: requireEnv('SUPABASE_SERVICE_ROLE_KEY'),
    port: parseInt(process.env['PORT'] ?? '3001', 10),
    corsOrigin: process.env['CORS_ORIGIN'] ?? 'http://localhost:5173',
    sandboxTimeoutMs: parseInt(process.env['SANDBOX_TIMEOUT_MS'] ?? '10000', 10),
    sandboxMemoryLimit: process.env['SANDBOX_MEMORY_LIMIT'] ?? '128m',
    sandboxCpuLimit: parseFloat(process.env['SANDBOX_CPU_LIMIT'] ?? '0.5'),
    nodeEnv: (process.env['NODE_ENV'] as EnvironmentConfig['nodeEnv']) ?? 'development',
  };
}

export const config = loadConfig();
