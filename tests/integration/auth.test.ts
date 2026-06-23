import { beforeEach, describe, expect, it } from 'vitest';
import { POST as login } from '@/app/api/auth/login/route';
import { POST as logout } from '@/app/api/auth/logout/route';
import { GET as me } from '@/app/api/auth/me/route';
import { hashToken, SESSION_COOKIE } from '@/lib/server/auth';
import { prisma } from '@/lib/server/db';
import { ADMIN_EMAIL, ADMIN_PASSWORD, call, createAdmin, resetDb } from './helpers';

function sessionFrom(headers: Headers): string | undefined {
  const cookie = headers.get('set-cookie') ?? '';
  return cookie.match(new RegExp(`${SESSION_COOKIE}=([^;]*)`))?.[1];
}

describe('auth routes', () => {
  beforeEach(async () => {
    await resetDb();
    await createAdmin();
  });

  it('signs in with the right password and sets an http-only cookie', async () => {
    const res = await call(login, {
      method: 'POST',
      body: { email: ADMIN_EMAIL, password: ADMIN_PASSWORD },
    });
    expect(res.status).toBe(200);
    expect(res.body.user).toMatchObject({ email: ADMIN_EMAIL, name: 'League Admin' });
    expect(res.body.user.passwordHash).toBeUndefined();
    expect(res.headers.get('set-cookie')).toMatch(/HttpOnly/i);
    expect(sessionFrom(res.headers)).toBeTruthy();
  });

  it('accepts the email in any case', async () => {
    const res = await call(login, {
      method: 'POST',
      body: { email: 'Admin@Example.COM', password: ADMIN_PASSWORD },
    });
    expect(res.status).toBe(200);
  });

  it('rejects a wrong password', async () => {
    const res = await call(login, {
      method: 'POST',
      body: { email: ADMIN_EMAIL, password: 'nope' },
    });
    expect(res.status).toBe(401);
    expect(res.body.error).toBe('Invalid email or password');
  });

  it('rejects an unknown email with the same message', async () => {
    const res = await call(login, {
      method: 'POST',
      body: { email: 'someone@example.com', password: ADMIN_PASSWORD },
    });
    expect(res.status).toBe(401);
    expect(res.body.error).toBe('Invalid email or password');
  });

  it('blocks an address after five failed attempts', async () => {
    const attempt = (password: string) =>
      call(login, {
        method: 'POST',
        body: { email: 'blocked@example.com', password },
      });
    for (let i = 0; i < 5; i++) expect((await attempt('wrong')).status).toBe(401);
    const blocked = await attempt('wrong');
    expect(blocked.status).toBe(429);
    expect(Number(blocked.headers.get('retry-after'))).toBeGreaterThan(0);
  });

  it('validates the request body', async () => {
    const res = await call(login, { method: 'POST', body: { email: 'not-an-email' } });
    expect(res.status).toBe(400);
    expect(res.body.details.map((d: { path: string }) => d.path)).toEqual(['email', 'password']);
  });

  it('stores only a hash of the session token', async () => {
    const res = await call(login, {
      method: 'POST',
      body: { email: ADMIN_EMAIL, password: ADMIN_PASSWORD },
    });
    const token = sessionFrom(res.headers)!;
    const session = await prisma.session.findFirstOrThrow();
    expect(session.tokenHash).toBe(hashToken(token));
  });

  it('returns the current admin for a valid session', async () => {
    const res = await call(login, {
      method: 'POST',
      body: { email: ADMIN_EMAIL, password: ADMIN_PASSWORD },
    });
    const cookie = `${SESSION_COOKIE}=${sessionFrom(res.headers)}`;
    const current = await call(me, { cookie });
    expect(current.status).toBe(200);
    expect(current.body.user.email).toBe(ADMIN_EMAIL);
  });

  it('returns 401 without a session', async () => {
    expect((await call(me)).status).toBe(401);
    expect((await call(me, { cookie: `${SESSION_COOKIE}=forged` })).status).toBe(401);
  });

  it('renews a session that is past half of its lifetime', async () => {
    const res = await call(login, {
      method: 'POST',
      body: { email: ADMIN_EMAIL, password: ADMIN_PASSWORD },
    });
    const soon = new Date(Date.now() + 2 * 24 * 60 * 60 * 1000);
    await prisma.session.updateMany({ data: { expiresAt: soon } });
    const cookie = `${SESSION_COOKIE}=${sessionFrom(res.headers)}`;
    expect((await call(me, { cookie })).status).toBe(200);
    const session = await prisma.session.findFirstOrThrow();
    expect(session.expiresAt.getTime()).toBeGreaterThan(Date.now() + 13 * 24 * 60 * 60 * 1000);
  });

  it('leaves a fresh session alone', async () => {
    const res = await call(login, {
      method: 'POST',
      body: { email: ADMIN_EMAIL, password: ADMIN_PASSWORD },
    });
    const before = (await prisma.session.findFirstOrThrow()).expiresAt;
    await call(me, { cookie: `${SESSION_COOKIE}=${sessionFrom(res.headers)}` });
    expect((await prisma.session.findFirstOrThrow()).expiresAt).toEqual(before);
  });

  it('treats an expired session as signed out', async () => {
    const res = await call(login, {
      method: 'POST',
      body: { email: ADMIN_EMAIL, password: ADMIN_PASSWORD },
    });
    await prisma.session.updateMany({ data: { expiresAt: new Date(Date.now() - 1000) } });
    const cookie = `${SESSION_COOKIE}=${sessionFrom(res.headers)}`;
    expect((await call(me, { cookie })).status).toBe(401);
  });

  it('removes expired sessions when somebody signs in', async () => {
    const admin = await prisma.adminUser.findFirstOrThrow();
    await prisma.session.create({
      data: { tokenHash: 'old', userId: admin.id, expiresAt: new Date(Date.now() - 60_000) },
    });
    await call(login, { method: 'POST', body: { email: ADMIN_EMAIL, password: ADMIN_PASSWORD } });
    const sessions = await prisma.session.findMany();
    expect(sessions).toHaveLength(1);
    expect(sessions[0].tokenHash).not.toBe('old');
  });

  it('signs out by deleting the session', async () => {
    const res = await call(login, {
      method: 'POST',
      body: { email: ADMIN_EMAIL, password: ADMIN_PASSWORD },
    });
    const cookie = `${SESSION_COOKIE}=${sessionFrom(res.headers)}`;
    const out = await call(logout, { method: 'POST', cookie });
    expect(out.status).toBe(200);
    expect(await prisma.session.count()).toBe(0);
    expect((await call(me, { cookie })).status).toBe(401);
  });
});
