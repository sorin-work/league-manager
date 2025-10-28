import { NextRequest } from 'next/server';
import { createSession, hashPassword, SESSION_COOKIE } from '@/lib/server/auth';
import { prisma } from '@/lib/server/db';

export const ADMIN_EMAIL = 'admin@example.com';
export const ADMIN_PASSWORD = 'admin-password';

export async function createAdmin(email = ADMIN_EMAIL, password = ADMIN_PASSWORD) {
  return prisma.adminUser.create({
    data: { email, name: 'League Admin', passwordHash: await hashPassword(password) },
  });
}

/** Creates an admin with a session and returns the cookie header to send. */
export async function adminCookie(): Promise<string> {
  const admin = await createAdmin();
  const { token } = await createSession(admin.id);
  return `${SESSION_COOKIE}=${token}`;
}

/** Empties every table, keeping the migration history. */
export async function resetDb() {
  const tables = await prisma.$queryRaw<{ tablename: string }[]>`
    SELECT tablename FROM pg_tables
    WHERE schemaname = 'public' AND tablename <> '_prisma_migrations'`;
  if (tables.length === 0) return;
  const list = tables.map((t) => `"${t.tablename}"`).join(', ');
  await prisma.$executeRawUnsafe(`TRUNCATE ${list} RESTART IDENTITY CASCADE`);
}

type Handler<P> = (req: NextRequest, ctx: { params: Promise<P> }) => Promise<Response>;

interface CallOptions<P> {
  method?: string;
  path?: string;
  body?: unknown;
  cookie?: string;
  params?: P;
}

export interface CallResult {
  status: number;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  body: any;
  headers: Headers;
}

/** Invokes a route handler the way Next.js would. */
export async function call<P>(handler: Handler<P>, opts: CallOptions<P> = {}): Promise<CallResult> {
  const headers = new Headers();
  if (opts.body !== undefined) headers.set('content-type', 'application/json');
  if (opts.cookie) headers.set('cookie', opts.cookie);
  const req = new NextRequest(new URL(opts.path ?? '/', 'http://localhost'), {
    method: opts.method ?? 'GET',
    headers,
    body: opts.body === undefined ? undefined : JSON.stringify(opts.body),
  });
  const res = await handler(req, { params: Promise.resolve((opts.params ?? {}) as P) });
  const text = await res.text();
  return { status: res.status, body: text ? JSON.parse(text) : null, headers: res.headers };
}
