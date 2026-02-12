/**
 * IP-based rate limiting middleware for Elysia.
 *
 * Applies a global per-IP sliding-window rate limit to all routes.
 * Returns 429 Too Many Requests with Retry-After header when exceeded.
 *
 * Uses in-memory storage — suitable for single-process deployments.
 */
import { Elysia } from 'elysia';
import { RateLimiter } from '../services/rate-limiter';
import { logger } from '../lib/logger';

/** Extract client IP from request headers (proxy-aware) */
export function extractClientIp(request: Request): string {
  return (
    request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ??
    request.headers.get('x-real-ip') ??
    '127.0.0.1'
  );
}

/**
 * Create an IP rate limiting middleware.
 * @param maxPerMinute Maximum requests per IP per minute.
 */
export function ipRateLimit(maxPerMinute: number) {
  const limiter = new RateLimiter();

  return new Elysia({ name: 'ip-rate-limit' })
    .onBeforeHandle(({ request, set }): { success: false; data: null; error: { code: string; message: string; details: { retryAfter: number } } } | undefined => {
      const ip = extractClientIp(request);

      if (!limiter.check(ip, maxPerMinute)) {
        const retryAfter = limiter.getRetryAfter(ip);
        set.status = 429;
        set.headers['retry-after'] = String(retryAfter);

        logger.warn('rate_limit.ip_exceeded', {
          ip,
          path: new URL(request.url).pathname,
        });

        return {
          success: false,
          data: null,
          error: {
            code: 'RATE_LIMIT_EXCEEDED',
            message: 'Too many requests. Please try again later.',
            details: { retryAfter },
          },
        };
      }

      limiter.record(ip);
      return undefined;
    })
    .as('global');
}
