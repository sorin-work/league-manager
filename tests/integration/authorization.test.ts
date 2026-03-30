import { beforeAll, describe, expect, it } from 'vitest';
import * as adjustment from '@/app/api/adjustments/[id]/route';
import * as divisionAdjustments from '@/app/api/divisions/[id]/adjustments/route';
import * as divisionCopyTeams from '@/app/api/divisions/[id]/copy-teams/route';
import * as divisionFixtures from '@/app/api/divisions/[id]/fixtures/route';
import * as division from '@/app/api/divisions/[id]/route';
import * as divisionTeams from '@/app/api/divisions/[id]/teams/route';
import * as matchResult from '@/app/api/matches/[id]/result/route';
import * as match from '@/app/api/matches/[id]/route';
import * as matchWalkover from '@/app/api/matches/[id]/walkover/route';
import * as player from '@/app/api/players/[id]/route';
import * as seasonDivisions from '@/app/api/seasons/[id]/divisions/route';
import * as season from '@/app/api/seasons/[id]/route';
import * as seasons from '@/app/api/seasons/route';
import * as teamPlayersImport from '@/app/api/teams/[id]/players/import/route';
import * as teamPlayers from '@/app/api/teams/[id]/players/route';
import * as team from '@/app/api/teams/[id]/route';
import * as venue from '@/app/api/venues/[id]/route';
import * as venues from '@/app/api/venues/route';
import { SESSION_COOKIE } from '@/lib/server/auth';
import { call, resetDb } from './helpers';

type Handler = (req: never, ctx: never) => Promise<Response>;
type RouteModule = Partial<Record<'POST' | 'PUT' | 'PATCH' | 'DELETE', Handler>>;

const routes: [string, RouteModule][] = [
  ['/api/seasons', seasons],
  ['/api/seasons/:id', season],
  ['/api/seasons/:id/divisions', seasonDivisions],
  ['/api/divisions/:id', division],
  ['/api/divisions/:id/teams', divisionTeams],
  ['/api/divisions/:id/fixtures', divisionFixtures],
  ['/api/divisions/:id/adjustments', divisionAdjustments],
  ['/api/divisions/:id/copy-teams', divisionCopyTeams],
  ['/api/adjustments/:id', adjustment],
  ['/api/teams/:id', team],
  ['/api/teams/:id/players', teamPlayers],
  ['/api/teams/:id/players/import', teamPlayersImport],
  ['/api/players/:id', player],
  ['/api/venues', venues],
  ['/api/venues/:id', venue],
  ['/api/matches/:id', match],
  ['/api/matches/:id/result', matchResult],
  ['/api/matches/:id/walkover', matchWalkover],
];

const writes = routes.flatMap(([path, mod]) =>
  (['POST', 'PUT', 'PATCH', 'DELETE'] as const)
    .filter((method) => mod[method])
    .map((method) => ({ name: `${method} ${path}`, method, handler: mod[method]! })),
);

describe('authorization', () => {
  beforeAll(async () => {
    await resetDb();
  });

  it('covers a sensible number of endpoints', () => {
    expect(writes.length).toBeGreaterThanOrEqual(20);
  });

  it.each(writes)('$name answers 401 without a session', async ({ method, handler }) => {
    const res = await call(handler as never, {
      method,
      params: { id: 'any' },
      body: {},
    });
    expect(res.status).toBe(401);
  });

  it.each(writes)('$name answers 401 with a forged session', async ({ method, handler }) => {
    const res = await call(handler as never, {
      method,
      params: { id: 'any' },
      body: {},
      cookie: `${SESSION_COOKIE}=not-a-real-token`,
    });
    expect(res.status).toBe(401);
  });
});
