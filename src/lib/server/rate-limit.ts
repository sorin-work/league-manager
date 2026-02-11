/**
 * Counts failures per key inside a sliding time window. Kept in memory: good
 * enough for a single app instance, and it resets on restart.
 */
export class FailureLimiter {
  private readonly failures = new Map<string, number[]>();

  constructor(
    private readonly maxFailures: number,
    private readonly windowMs: number,
    private readonly now: () => number = Date.now,
  ) {}

  private recent(key: string): number[] {
    const cutoff = this.now() - this.windowMs;
    const list = (this.failures.get(key) ?? []).filter((t) => t > cutoff);
    if (list.length === 0) this.failures.delete(key);
    else this.failures.set(key, list);
    return list;
  }

  /** Seconds until the key may try again, or 0 when it is not blocked. */
  retryAfter(key: string): number {
    const list = this.recent(key);
    if (list.length < this.maxFailures) return 0;
    const oldest = list[list.length - this.maxFailures];
    return Math.max(1, Math.ceil((oldest + this.windowMs - this.now()) / 1000));
  }

  fail(key: string) {
    this.failures.set(key, [...this.recent(key), this.now()]);
  }

  reset(key: string) {
    this.failures.delete(key);
  }
}

export const loginLimiter = new FailureLimiter(5, 15 * 60 * 1000);

export function clientIp(headers: Headers): string {
  return (
    headers.get('x-forwarded-for')?.split(',')[0].trim() || headers.get('x-real-ip') || 'local'
  );
}
