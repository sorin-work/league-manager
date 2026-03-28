import { beforeEach, describe, expect, it } from 'vitest';
import { POST as importRoster } from '@/app/api/teams/[id]/players/import/route';
import { prisma } from '@/lib/server/db';
import { adminCookie, call, createLeague, resetDb } from './helpers';

let cookie: string;
let teamId: string;

beforeEach(async () => {
  await resetDb();
  cookie = await adminCookie();
  const league = await createLeague({ teams: 2, playersPerTeam: 2 });
  teamId = league.teams[0].id;
});

const send = (csv: string, replace = false) =>
  call(importRoster, { method: 'POST', params: { id: teamId }, body: { csv, replace }, cookie });

describe('POST /api/teams/:id/players/import', () => {
  it('adds the players from the file', async () => {
    const res = await send('name,number\nNew Keeper,13\nNew Winger,11\nNo Number');
    expect(res.status).toBe(201);
    expect(res.body).toEqual({ imported: 3 });
    expect(await prisma.player.count({ where: { teamId } })).toBe(5);
  });

  it('reports unreadable rows and imports nothing', async () => {
    const res = await send('name,number\nGood,20\nBad,200');
    expect(res.status).toBe(400);
    expect(res.body.details).toEqual([{ line: 3, message: expect.stringMatching(/1-99/) }]);
    expect(await prisma.player.count({ where: { teamId } })).toBe(2);
  });

  it('refuses shirt numbers that are already taken', async () => {
    const res = await send('Clash,1');
    expect(res.status).toBe(409);
    expect(res.body.error).toMatch(/already taken: 1/);
  });

  it('replaces the squad when asked', async () => {
    const res = await send('Only One,1', true);
    expect(res.status).toBe(201);
    const players = await prisma.player.findMany({ where: { teamId } });
    expect(players.map((p) => p.name)).toEqual(['Only One']);
  });

  it('will not replace players who already have match events', async () => {
    const league = await prisma.team.findUniqueOrThrow({
      where: { id: teamId },
      include: { players: true, division: { include: { teams: true } } },
    });
    const other = league.division.teams.find((t) => t.id !== teamId)!;
    const match = await prisma.match.create({
      data: {
        divisionId: league.divisionId,
        round: 1,
        homeTeamId: teamId,
        awayTeamId: other.id,
        status: 'PLAYED',
        homeScore: 1,
        awayScore: 0,
      },
    });
    await prisma.matchEvent.create({
      data: { matchId: match.id, playerId: league.players[0].id, teamId, type: 'GOAL' },
    });
    const res = await send('Fresh Face,5', true);
    expect(res.status).toBe(409);
    expect(await prisma.player.count({ where: { teamId } })).toBe(2);
  });

  it('rejects an empty file', async () => {
    expect((await send('')).status).toBe(400);
    expect((await send('\n\n')).status).toBe(400);
  });
});
