import { describe, expect, it } from 'vitest';
import { clientIp, FailureLimiter } from '@/lib/server/rate-limit';

function limiter() {
  let now = 1_000_000;
  const l = new FailureLimiter(3, 60_000, () => now);
  return { l, advance: (ms: number) => (now += ms) };
}

describe('FailureLimiter', () => {
  it('allows attempts below the limit', () => {
    const { l } = limiter();
    l.fail('a');
    l.fail('a');
    expect(l.retryAfter('a')).toBe(0);
  });

  it('blocks once the limit is reached and says for how long', () => {
    const { l, advance } = limiter();
    l.fail('a');
    advance(10_000);
    l.fail('a');
    l.fail('a');
    expect(l.retryAfter('a')).toBe(50);
  });

  it('forgets failures outside the window', () => {
    const { l, advance } = limiter();
    l.fail('a');
    l.fail('a');
    l.fail('a');
    advance(60_001);
    expect(l.retryAfter('a')).toBe(0);
  });

  it('keeps keys apart and can be reset', () => {
    const { l } = limiter();
    for (let i = 0; i < 3; i++) l.fail('a');
    expect(l.retryAfter('b')).toBe(0);
    l.reset('a');
    expect(l.retryAfter('a')).toBe(0);
  });
});

describe('clientIp', () => {
  it('uses the first forwarded address', () => {
    expect(clientIp(new Headers({ 'x-forwarded-for': '203.0.113.7, 10.0.0.1' }))).toBe(
      '203.0.113.7',
    );
  });

  it('falls back when there are no proxy headers', () => {
    expect(clientIp(new Headers())).toBe('local');
  });
});
