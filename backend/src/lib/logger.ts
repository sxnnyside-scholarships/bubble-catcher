/**
 * Structured JSON logger for Bubble Catcher.
 *
 * Outputs one JSON object per line to stdout/stderr.
 * Never logs raw SQL — only SHA-256 hashes.
 */
import { createHash } from 'crypto';

export type LogLevel = 'info' | 'warn' | 'error';

interface LogFields {
  requestId?: string;
  userId?: string;
  ip?: string;
  method?: string;
  path?: string;
  dialect?: string;
  executionTimeMs?: number;
  status?: number;
  queryHash?: string;
  code?: string;
  [key: string]: unknown;
}

function write(level: LogLevel, message: string, fields?: LogFields): void {
  const entry = {
    timestamp: new Date().toISOString(),
    level,
    message,
    ...fields,
  };

  const out = level === 'error' ? process.stderr : process.stdout;
  out.write(JSON.stringify(entry) + '\n');
}

export const logger = {
  info(message: string, fields?: LogFields): void {
    write('info', message, fields);
  },
  warn(message: string, fields?: LogFields): void {
    write('warn', message, fields);
  },
  error(message: string, fields?: LogFields): void {
    write('error', message, fields);
  },
};

/** SHA-256 hash of SQL, truncated to first 16 hex chars. Safe for logging. */
export function hashQuery(sql: string): string {
  return 'sha256:' + createHash('sha256').update(sql).digest('hex').slice(0, 16);
}
