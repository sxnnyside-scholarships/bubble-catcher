/**
 * In-memory sliding-window rate limiter.
 *
 * Tracks execution timestamps per user and enforces
 * a maximum number of executions per window (default: 1 minute).
 *
 * This is intentionally in-memory — no external dependencies.
 * Suitable for single-process deployment. For multi-process,
 * replace with Redis-backed implementation.
 */

const DEFAULT_WINDOW_MS = 60_000; // 1 minute
const CLEANUP_INTERVAL_MS = 5 * 60_000; // 5 minutes

interface UserWindow {
  timestamps: number[];
}

export class RateLimiter {
  private readonly windows = new Map<string, UserWindow>();
  private readonly windowMs: number;
  private cleanupTimer: ReturnType<typeof setInterval> | null = null;

  constructor(windowMs = DEFAULT_WINDOW_MS) {
    this.windowMs = windowMs;

    /* Periodically remove stale entries to prevent unbounded memory growth */
    this.cleanupTimer = setInterval(() => this.cleanup(), CLEANUP_INTERVAL_MS);
    /* Allow the process to exit without waiting for this timer */
    if (this.cleanupTimer && typeof this.cleanupTimer === 'object' && 'unref' in this.cleanupTimer) {
      this.cleanupTimer.unref();
    }
  }

  /**
   * Check whether a user is allowed to execute.
   * @returns `true` if within limits, `false` if rate limited.
   */
  check(userId: string, maxPerWindow: number): boolean {
    const now = Date.now();
    const cutoff = now - this.windowMs;

    let window = this.windows.get(userId);
    if (!window) {
      window = { timestamps: [] };
      this.windows.set(userId, window);
    }

    /* Evict expired timestamps */
    window.timestamps = window.timestamps.filter((ts) => ts > cutoff);

    return window.timestamps.length < maxPerWindow;
  }

  /**
   * Compute seconds until the next slot opens for this key.
   * Returns 0 if there is no congestion.
   */
  getRetryAfter(key: string): number {
    const window = this.windows.get(key);
    if (!window || window.timestamps.length === 0) return 0;
    const oldest = Math.min(...window.timestamps);
    const expiresAt = oldest + this.windowMs;
    return Math.max(1, Math.ceil((expiresAt - Date.now()) / 1000));
  }

  /**
   * Record an execution for rate limiting.
   * Call this AFTER `check()` returns true and before executing.
   */
  record(userId: string): void {
    const window = this.windows.get(userId);
    if (window) {
      window.timestamps.push(Date.now());
    } else {
      this.windows.set(userId, { timestamps: [Date.now()] });
    }
  }

  /** Remove entries with no recent activity */
  private cleanup(): void {
    const cutoff = Date.now() - this.windowMs;
    for (const [userId, window] of this.windows) {
      window.timestamps = window.timestamps.filter((ts) => ts > cutoff);
      if (window.timestamps.length === 0) {
        this.windows.delete(userId);
      }
    }
  }

  /** Destroy the limiter (for testing / shutdown) */
  destroy(): void {
    if (this.cleanupTimer) {
      clearInterval(this.cleanupTimer);
      this.cleanupTimer = null;
    }
    this.windows.clear();
  }
}

/** Singleton rate limiter for execution endpoint */
export const executionRateLimiter = new RateLimiter();
