import { describe, expect, it } from 'vitest';
import { hashPassword, hashToken, newSessionToken, verifyPassword } from '@/lib/server/auth';

describe('passwords', () => {
  it('verifies the password that was hashed', async () => {
    const hash = await hashPassword('correct horse');
    expect(hash).not.toContain('correct horse');
    expect(await verifyPassword('correct horse', hash)).toBe(true);
  });

  it('rejects a different password', async () => {
    const hash = await hashPassword('correct horse');
    expect(await verifyPassword('battery staple', hash)).toBe(false);
  });
});

describe('session tokens', () => {
  it('are long and unique', () => {
    const a = newSessionToken();
    const b = newSessionToken();
    expect(a).not.toBe(b);
    expect(a.length).toBeGreaterThanOrEqual(43);
  });

  it('are stored as a stable sha256 hash', () => {
    const token = newSessionToken();
    expect(hashToken(token)).toBe(hashToken(token));
    expect(hashToken(token)).toMatch(/^[0-9a-f]{64}$/);
    expect(hashToken(token)).not.toBe(token);
  });
});
