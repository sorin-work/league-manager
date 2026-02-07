import { beforeEach, describe, expect, it } from 'vitest';
import { POST as generate } from '@/app/api/divisions/[id]/fixtures/route';
import { GET as scorers } from '@/app/api/divisions/[id]/scorers/route';
import { GET as standings } from '@/app/api/divisions/[id]/standings/route';
import { GET as suspensions } from '@/app/api/divisions/[id]/suspensions/route';
import { DELETE as clearResult, PUT as saveResult } from '@/app/api/matches/[id]/result/route';
import { prisma } from '@/lib/server/db';
import { adminCookie, call, createLeague, resetDb } from './helpers';

let cookie: string;
let league: Awaited<ReturnType<typeof createLeague>>;

beforeEach(async () => {
  await resetDb();
  cookie = await adminCookie();
  league = await createLeague({ teams: 4, playersPerTeam: 3 });
  await call(generate, {
    method: 'POST',
    params: { id: league.division.id },
    body: { startDate: '2025-09-06' },
    cookie,
  });
});

const matchesInOrder = () =>
  prisma.match.findMany({
    where: { divisionId: league.division.id },
    orderBy: [{ round: 'asc' }, { kickoffAt: 'asc' }, { id: 'asc' }],
  });

const playerOf = (teamId: string, index = 0) =>
  league.teams.find((t) => t.id === teamId)!.players[index].id;

function enter(matchId: string, body: object) {
  return call(saveResult, { method: 'PUT', params: { id: matchId }, body, cookie });
}

describe('PUT /api/matches/:id/result', () => {
  it('saves the score and events and marks the match as played', async () => {
    const [m] = await matchesInOrder();
    const res = await enter(m.id, {
      homeScore: 2,
      awayScore: 1,
      events: [
        { playerId: playerOf(m.homeTeamId), type: 'GOAL', minute: 12 },
        { playerId: playerOf(m.homeTeamId, 1), type: 'PENALTY_GOAL', minute: 40 },
        { playerId: playerOf(m.awayTeamId), type: 'GOAL', minute: 77 },
        { playerId: playerOf(m.awayTeamId, 2), type: 'YELLOW_CARD', minute: 80 },
      ],
    });
    expect(res.status).toBe(200);
    expect(res.body.match).toMatchObject({ status: 'PLAYED', homeScore: 2, awayScore: 1 });
    expect(res.body.match.events).toHaveLength(4);
    expect(res.body.match.events[0]).toMatchObject({ minute: 12, teamId: m.homeTeamId });
  });

  it('requires an admin', async () => {
    const [m] = await matchesInOrder();
    const res = await call(saveResult, {
      method: 'PUT',
      params: { id: m.id },
      body: { homeScore: 9, awayScore: 0 },
    });
    expect(res.status).toBe(401);
    const unchanged = await prisma.match.findUniqueOrThrow({ where: { id: m.id } });
    expect(unchanged.status).toBe('SCHEDULED');
  });

  it('replaces events when the result is entered again', async () => {
    const [m] = await matchesInOrder();
    await enter(m.id, {
      homeScore: 1,
      awayScore: 0,
      events: [{ playerId: playerOf(m.homeTeamId), type: 'GOAL' }],
    });
    await enter(m.id, { homeScore: 0, awayScore: 0, events: [] });
    expect(await prisma.matchEvent.count({ where: { matchId: m.id } })).toBe(0);
  });

  it('counts own goals for the other side', async () => {
    const [m] = await matchesInOrder();
    const res = await enter(m.id, {
      homeScore: 0,
      awayScore: 1,
      events: [{ playerId: playerOf(m.homeTeamId), type: 'OWN_GOAL' }],
    });
    expect(res.status).toBe(200);
    const tooMany = await enter(m.id, {
      homeScore: 1,
      awayScore: 0,
      events: [{ playerId: playerOf(m.homeTeamId), type: 'OWN_GOAL' }],
    });
    expect(tooMany.status).toBe(400);
  });

  it('rejects more listed goals than the score', async () => {
    const [m] = await matchesInOrder();
    const res = await enter(m.id, {
      homeScore: 1,
      awayScore: 0,
      events: [
        { playerId: playerOf(m.homeTeamId), type: 'GOAL' },
        { playerId: playerOf(m.homeTeamId), type: 'GOAL' },
      ],
    });
    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/home goals/);
  });

  it('allows goals without a known scorer', async () => {
    const [m] = await matchesInOrder();
    const res = await enter(m.id, { homeScore: 4, awayScore: 3 });
    expect(res.status).toBe(200);
  });

  it('rejects unknown players and bad scores', async () => {
    const [m] = await matchesInOrder();
    const unknown = await enter(m.id, {
      homeScore: 1,
      awayScore: 0,
      events: [{ playerId: 'ghost', type: 'GOAL' }],
    });
    expect(unknown.status).toBe(400);
    expect((await enter(m.id, { homeScore: -1, awayScore: 0 })).status).toBe(400);
  });

  it('does not take results for a cancelled match', async () => {
    const [m] = await matchesInOrder();
    await prisma.match.update({ where: { id: m.id }, data: { status: 'CANCELLED' } });
    expect((await enter(m.id, { homeScore: 1, awayScore: 1 })).status).toBe(409);
  });

  it('can clear a result again', async () => {
    const [m] = await matchesInOrder();
    await enter(m.id, {
      homeScore: 1,
      awayScore: 0,
      events: [{ playerId: playerOf(m.homeTeamId), type: 'GOAL' }],
    });
    const res = await call(clearResult, { method: 'DELETE', params: { id: m.id }, cookie });
    expect(res.body.match).toMatchObject({ status: 'SCHEDULED', homeScore: null });
    expect(await prisma.matchEvent.count()).toBe(0);
  });
});

describe('GET /api/divisions/:id/standings', () => {
  it('lists all teams before any result', async () => {
    const res = await call(standings, { params: { id: league.division.id } });
    expect(res.body.standings).toHaveLength(4);
    expect(res.body.rules.pointsForWin).toBe(3);
  });

  it('builds the table from entered results', async () => {
    const [m1, m2] = await matchesInOrder();
    await enter(m1.id, { homeScore: 3, awayScore: 0 });
    await enter(m2.id, { homeScore: 1, awayScore: 1 });
    const res = await call(standings, { params: { id: league.division.id } });
    expect(res.body.standings[0]).toMatchObject({ teamId: m1.homeTeamId, points: 3, played: 1 });
    const drawn = res.body.standings.filter((r: { drawn: number }) => r.drawn === 1);
    expect(drawn).toHaveLength(2);
  });

  it('uses the points rules of the season', async () => {
    await prisma.season.update({ where: { id: league.season.id }, data: { pointsForWin: 2 } });
    const [m1] = await matchesInOrder();
    await enter(m1.id, { homeScore: 1, awayScore: 0 });
    const res = await call(standings, { params: { id: league.division.id } });
    expect(res.body.standings[0].points).toBe(2);
  });
});

describe('GET /api/divisions/:id/scorers', () => {
  it('ranks scorers across matches', async () => {
    const [m1, m2] = await matchesInOrder();
    const striker = playerOf(m1.homeTeamId);
    await enter(m1.id, {
      homeScore: 2,
      awayScore: 0,
      events: [
        { playerId: striker, type: 'GOAL' },
        { playerId: striker, type: 'GOAL' },
      ],
    });
    await enter(m2.id, {
      homeScore: 1,
      awayScore: 0,
      events: [{ playerId: playerOf(m2.homeTeamId), type: 'GOAL' }],
    });
    const res = await call(scorers, { params: { id: league.division.id } });
    expect(res.body.scorers[0]).toMatchObject({ playerId: striker, goals: 2, rank: 1 });
    expect(res.body.scorers).toHaveLength(2);
  });
});

describe('GET /api/divisions/:id/suspensions', () => {
  it('lists a red card ban until it is served', async () => {
    await prisma.season.update({ where: { id: league.season.id }, data: { redCardBan: 1 } });
    const ms = await matchesInOrder();
    const first = ms[0];
    const offender = playerOf(first.homeTeamId);
    await enter(first.id, {
      homeScore: 0,
      awayScore: 0,
      events: [{ playerId: offender, type: 'RED_CARD', minute: 30 }],
    });
    const res = await call(suspensions, { params: { id: league.division.id } });
    expect(res.body.suspensions).toHaveLength(1);
    expect(res.body.suspensions[0]).toMatchObject({
      playerId: offender,
      reason: 'RED_CARD',
      remaining: 1,
    });
    expect(res.body.suspensions[0].playerName).toContain('Player 1');

    // the team's next match is played: the ban is served
    const next = ms.find(
      (m) =>
        m.round > first.round &&
        (m.homeTeamId === first.homeTeamId || m.awayTeamId === first.homeTeamId),
    )!;
    await enter(next.id, { homeScore: 0, awayScore: 0 });
    const after = await call(suspensions, { params: { id: league.division.id } });
    expect(after.body.suspensions).toEqual([]);
    const all = await call(suspensions, {
      params: { id: league.division.id },
      path: `/api/divisions/${league.division.id}/suspensions?all=true`,
    });
    expect(all.body.suspensions).toHaveLength(1);
  });
});
