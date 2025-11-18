import type { Prisma } from '@prisma/client';
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

const TEAM_NAMES = [
  'Ashby Athletic',
  'Brookside Borough',
  'Castle City',
  'Dale Dynamo',
  'Eastfield',
  'Fernhill Rangers',
  'Greenway United',
  'Harbour Town',
];

interface LeagueOptions {
  teams?: number;
  playersPerTeam?: number;
  season?: Partial<Prisma.SeasonCreateInput>;
}

/** Season, division and teams (with players) straight in the database. */
export async function createLeague(opts: LeagueOptions = {}) {
  const season = await prisma.season.create({
    data: {
      name: 'Test Season',
      slug: `test-season-${Math.random().toString(36).slice(2, 8)}`,
      startDate: new Date('2025-09-01T00:00:00Z'),
      endDate: new Date('2026-05-31T00:00:00Z'),
      ...opts.season,
    },
  });
  const division = await prisma.division.create({
    data: { seasonId: season.id, name: 'Premier', slug: 'premier' },
  });
  const teams = [];
  for (let i = 0; i < (opts.teams ?? 4); i++) {
    const name = TEAM_NAMES[i];
    const players = Array.from({ length: opts.playersPerTeam ?? 0 }, (_, n) => ({
      name: `${name.split(' ')[0]} Player ${n + 1}`,
      shirtNumber: n + 1,
    }));
    teams.push(
      await prisma.team.create({
        data: {
          divisionId: division.id,
          name,
          slug: name.toLowerCase().replace(/\s+/g, '-'),
          players: { create: players },
        },
        include: { players: { orderBy: { shirtNumber: 'asc' } } },
      }),
    );
  }
  return { season, division, teams };
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
