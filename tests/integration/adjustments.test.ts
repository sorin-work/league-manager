import { beforeEach, describe, expect, it } from 'vitest';
import { DELETE as remove } from '@/app/api/adjustments/[id]/route';
import { GET as list, POST as add } from '@/app/api/divisions/[id]/adjustments/route';
import { GET as standings } from '@/app/api/divisions/[id]/standings/route';
import { prisma } from '@/lib/server/db';
import { adminCookie, call, createLeague, resetDb } from './helpers';

let cookie: string;
let league: Awaited<ReturnType<typeof createLeague>>;

beforeEach(async () => {
  await resetDb();
  cookie = await adminCookie();
  league = await createLeague({ teams: 3 });
});

const deduct = (teamId: string, points = -3, reason = 'Fielded a suspended player') =>
  call(add, {
    method: 'POST',
    params: { id: league.division.id },
    body: { teamId, points, reason },
    cookie,
  });

describe('points adjustments', () => {
  it('deducts points in the table', async () => {
    const [a, b] = league.teams;
    await prisma.match.create({
      data: {
        divisionId: league.division.id,
        round: 1,
        homeTeamId: a.id,
        awayTeamId: b.id,
        status: 'PLAYED',
        homeScore: 2,
        awayScore: 0,
      },
    });
    expect((await deduct(a.id, -4)).status).toBe(201);
    const res = await call(standings, { params: { id: league.division.id } });
    const row = res.body.standings.find((r: { teamId: string }) => r.teamId === a.id);
    expect(row).toMatchObject({ points: -1, adjustment: -4, won: 1 });
    expect(res.body.standings.at(-1).teamId).toBe(a.id);
  });

  it('lists adjustments with team names', async () => {
    await deduct(league.teams[1].id, -1);
    const res = await call(list, { params: { id: league.division.id } });
    expect(res.body.adjustments).toHaveLength(1);
    expect(res.body.adjustments[0].team.name).toBe(league.teams[1].name);
  });

  it('rejects zero points and a missing reason', async () => {
    expect((await deduct(league.teams[0].id, 0)).status).toBe(400);
    expect((await deduct(league.teams[0].id, -3, '  ')).status).toBe(400);
  });

  it('rejects teams from another division', async () => {
    const other = await createLeague({ teams: 2 });
    const res = await deduct(other.teams[0].id);
    expect(res.status).toBe(400);
  });

  it('removes an adjustment', async () => {
    const { body } = await deduct(league.teams[0].id);
    const res = await call(remove, {
      method: 'DELETE',
      params: { id: body.adjustment.id },
      cookie,
    });
    expect(res.status).toBe(204);
    expect(await prisma.pointsAdjustment.count()).toBe(0);
  });
});
