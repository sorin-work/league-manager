import { beforeEach, describe, expect, it } from 'vitest';
import { DELETE as removeAdmin } from '@/app/api/admins/[id]/route';
import { GET as listAdmins, POST as addAdmin } from '@/app/api/admins/route';
import { POST as login } from '@/app/api/auth/login/route';
import { GET as me } from '@/app/api/auth/me/route';
import { POST as changePassword } from '@/app/api/auth/password/route';
import { createSession, SESSION_COOKIE } from '@/lib/server/auth';
import { prisma } from '@/lib/server/db';
import { ADMIN_EMAIL, ADMIN_PASSWORD, call, createAdmin, resetDb } from './helpers';

let cookie: string;
let adminId: string;

beforeEach(async () => {
  await resetDb();
  const admin = await createAdmin();
  adminId = admin.id;
  cookie = `${SESSION_COOKIE}=${(await createSession(admin.id)).token}`;
});

describe('password changes', () => {
  it('changes the password and keeps the current session', async () => {
    const res = await call(changePassword, {
      method: 'POST',
      body: { currentPassword: ADMIN_PASSWORD, newPassword: 'a-much-longer-secret' },
      cookie,
    });
    expect(res.status).toBe(200);
    expect((await call(me, { cookie })).status).toBe(200);
    const relogin = await call(login, {
      method: 'POST',
      body: { email: ADMIN_EMAIL, password: 'a-much-longer-secret' },
    });
    expect(relogin.status).toBe(200);
  });

  it('signs out the other sessions', async () => {
    const other = `${SESSION_COOKIE}=${(await createSession(adminId)).token}`;
    await call(changePassword, {
      method: 'POST',
      body: { currentPassword: ADMIN_PASSWORD, newPassword: 'a-much-longer-secret' },
      cookie,
    });
    expect((await call(me, { cookie: other })).status).toBe(401);
    expect(await prisma.session.count()).toBe(1);
  });

  it('needs the right current password and a long new one', async () => {
    const wrong = await call(changePassword, {
      method: 'POST',
      body: { currentPassword: 'nope', newPassword: 'a-much-longer-secret' },
      cookie,
    });
    expect(wrong.status).toBe(400);
    const short = await call(changePassword, {
      method: 'POST',
      body: { currentPassword: ADMIN_PASSWORD, newPassword: 'short' },
      cookie,
    });
    expect(short.status).toBe(400);
  });
});

describe('admin accounts', () => {
  it('adds an admin who can then sign in', async () => {
    const res = await call(addAdmin, {
      method: 'POST',
      body: { name: 'Second', email: 'Second@Example.com', password: 'second-password' },
      cookie,
    });
    expect(res.status).toBe(201);
    expect(res.body.admin.email).toBe('second@example.com');
    expect(res.body.admin.passwordHash).toBeUndefined();
    const signIn = await call(login, {
      method: 'POST',
      body: { email: 'second@example.com', password: 'second-password' },
    });
    expect(signIn.status).toBe(200);
  });

  it('refuses a duplicate email', async () => {
    const res = await call(addAdmin, {
      method: 'POST',
      body: { name: 'Again', email: ADMIN_EMAIL, password: 'another-password' },
      cookie,
    });
    expect(res.status).toBe(409);
  });

  it('lists admins without password hashes', async () => {
    const res = await call(listAdmins, { cookie });
    expect(res.body.admins).toHaveLength(1);
    expect(res.body.admins[0]).not.toHaveProperty('passwordHash');
  });

  it('removes another admin but not yourself', async () => {
    const other = await createAdmin('other@example.com');
    expect(
      (await call(removeAdmin, { method: 'DELETE', params: { id: adminId }, cookie })).status,
    ).toBe(400);
    expect(
      (await call(removeAdmin, { method: 'DELETE', params: { id: other.id }, cookie })).status,
    ).toBe(204);
  });
});
