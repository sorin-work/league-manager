import { beforeEach, describe, expect, it } from 'vitest';
import { POST as generate } from '@/app/api/divisions/[id]/fixtures/route';
import { PUT as saveScores } from '@/app/api/divisions/[id]/rounds/[round]/scores/route';
import { prisma } from '@/lib/server/db';
import { adminCookie, call, createLeague, resetDb } from './helpers';

let cookie: string;
let league: Awaited<ReturnType<typeof createLeague>>;

beforeEach(async () => {
  await resetDb();
  cookie = await adminCookie();
  league = await createLeague({ teams: 4, playersPerTeam: 1 });
  await call(generate, {
    method: 'POST',
    params: { id: league.division.id },
    body: { startDate: '2025-09-06' },
    cookie,
  });
});

const round = (n: number) =>
  prisma.match.findMany({ where: { divisionId: league.division.id, round: n } });

const save = (n: number, scores: object[]) =>
  call(saveScores, {
    method: 'PUT',
    params: { id: league.division.id, round: String(n) },
    body: { scores },
    cookie,
  });

describe('PUT /api/divisions/:id/rounds/:round/scores', () => {
  it('saves every score of the round', async () => {
    const [a, b] = await round(1);
    const res = await save(1, [
      { matchId: a.id, homeScore: 2, awayScore: 1 },
      { matchId: b.id, homeScore: 0, awayScore: 0 },
    ]);
    expect(res.body).toEqual({ saved: 2 });
    const after = await round(1);
    expect(after.every((m) => m.status === 'PLAYED')).toBe(true);
  });

  it('rejects matches from another round', async () => {
    const [other] = await round(2);
    const res = await save(1, [{ matchId: other.id, homeScore: 1, awayScore: 0 }]);
    expect(res.status).toBe(400);
  });

  it('leaves matches with events alone', async () => {
    const [m] = await round(1);
    const player = league.teams.find((t) => t.id === m.homeTeamId)!.players[0];
    await prisma.matchEvent.create({
      data: { matchId: m.id, playerId: player.id, teamId: player.teamId, type: 'GOAL' },
    });
    const res = await save(1, [{ matchId: m.id, homeScore: 0, awayScore: 3 }]);
    expect(res.status).toBe(409);
    expect((await prisma.match.findUniqueOrThrow({ where: { id: m.id } })).status).toBe(
      'SCHEDULED',
    );
  });

  it('saves nothing when one score is invalid', async () => {
    const [a, b] = await round(1);
    const res = await save(1, [
      { matchId: a.id, homeScore: 2, awayScore: 1 },
      { matchId: b.id, homeScore: -1, awayScore: 0 },
    ]);
    expect(res.status).toBe(400);
    expect((await round(1)).every((m) => m.status === 'SCHEDULED')).toBe(true);
  });

  it('rejects a bad round number', async () => {
    const res = await save(0, [{ matchId: 'x', homeScore: 1, awayScore: 0 }]);
    expect(res.status).toBe(400);
  });
});
