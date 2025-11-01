import { createHash, randomBytes } from 'node:crypto';
import bcrypt from 'bcryptjs';
import type { NextRequest } from 'next/server';
import { prisma } from './db';
import { SESSION_COOKIE } from '../session-cookie';
import { unauthorized } from './http';

export { SESSION_COOKIE };
export const SESSION_TTL_DAYS = 14;

const BCRYPT_ROUNDS = 10;
// compared against when the email is unknown, so both paths take as long
const DUMMY_HASH = bcrypt.hashSync('not-a-real-password', BCRYPT_ROUNDS);

export interface AdminIdentity {
  id: string;
  email: string;
  name: string;
}

export function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, BCRYPT_ROUNDS);
}

export function verifyPassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

export function newSessionToken(): string {
  return randomBytes(32).toString('base64url');
}

export function hashToken(token: string): string {
  return createHash('sha256').update(token).digest('hex');
}

export async function authenticate(email: string, password: string): Promise<AdminIdentity | null> {
  const user = await prisma.adminUser.findUnique({ where: { email: email.trim().toLowerCase() } });
  const ok = await verifyPassword(password, user?.passwordHash ?? DUMMY_HASH);
  if (!user || !ok) return null;
  return { id: user.id, email: user.email, name: user.name };
}

export async function createSession(userId: string) {
  const token = newSessionToken();
  const expiresAt = new Date(Date.now() + SESSION_TTL_DAYS * 24 * 60 * 60 * 1000);
  await prisma.session.create({ data: { tokenHash: hashToken(token), userId, expiresAt } });
  return { token, expiresAt };
}

export async function findSessionUser(token: string | undefined): Promise<AdminIdentity | null> {
  if (!token) return null;
  const session = await prisma.session.findUnique({
    where: { tokenHash: hashToken(token) },
    include: { user: true },
  });
  if (!session || session.expiresAt <= new Date()) return null;
  const { id, email, name } = session.user;
  return { id, email, name };
}

export async function destroySession(token: string | undefined) {
  if (!token) return;
  await prisma.session.deleteMany({ where: { tokenHash: hashToken(token) } });
}

/** Resolves the signed-in admin for an API request or throws a 401. */
export async function requireAdmin(req: NextRequest): Promise<AdminIdentity> {
  const user = await findSessionUser(req.cookies.get(SESSION_COOKIE)?.value);
  if (!user) throw unauthorized();
  return user;
}

export function sessionCookieOptions(expires: Date) {
  return {
    httpOnly: true,
    sameSite: 'lax' as const,
    path: '/',
    secure: process.env.COOKIE_SECURE === 'true',
    expires,
  };
}
