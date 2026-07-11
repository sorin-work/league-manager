import { beforeEach, describe, expect, it } from 'vitest';
import { DELETE as deleteDivision } from '@/app/api/divisions/[id]/route';
import { POST as generate } from '@/app/api/divisions/[id]/fixtures/route';
import { DELETE as deleteSeason } from '@/app/api/seasons/[id]/route';
import { GET as showVenue, PATCH as updateVenue } from '@/app/api/venues/[id]/route';
import { prisma } from '@/lib/server/db';
import { adminCookie, call, createLeague, resetDb } from './helpers';

let cookie: string;

beforeEach(async () => {
  await resetDb();
  cookie = await adminCookie();
});

describe('venues', () => {
  it('updates a venue and 404s for unknown ones', async () => {
    const venue = await prisma.venue.create({ data: { name: 'Old Rec' } });
    const res = await call(updateVenue, {
      method: 'PATCH',
      params: { id: venue.id },
      body: { name: 'New Rec', address: 'Mill Lane' },
      cookie,
    });
    expect(res.body.venue).toMatchObject({ name: 'New Rec', address: 'Mill Lane' });
    expect((await call(showVenue, { params: { id: 'missing' } })).status).toBe(404);
  });

  it('keeps matches when their venue is removed', async () => {
    const { division } = await createLeague();
    const venue = await prisma.venue.create({ data: { name: 'Rec' } });
    await call(generate, {
      method: 'POST',
      params: { id: division.id },
      body: { startDate: '2025-09-06', venueIds: [venue.id] },
      cookie,
    });
    await prisma.venue.delete({ where: { id: venue.id } });
    const matches = await prisma.match.findMany({ where: { divisionId: division.id } });
    expect(matches).toHaveLength(6);
    expect(matches.every((m) => m.venueId === null)).toBe(true);
  });
});

describe('deleting', () => {
  it('removes a division with its teams, players, matches and events', async () => {
    const { division, teams } = await createLeague({ teams: 2, playersPerTeam: 2 });
    const match = await prisma.match.create({
      data: {
        divisionId: division.id,
        round: 1,
        homeTeamId: teams[0].id,
        awayTeamId: teams[1].id,
        status: 'PLAYED',
        homeScore: 1,
        awayScore: 0,
      },
    });
    await prisma.matchEvent.create({
      data: {
        matchId: match.id,
        playerId: teams[0].players[0].id,
        teamId: teams[0].id,
        type: 'GOAL',
      },
    });
    const res = await call(deleteDivision, {
      method: 'DELETE',
      params: { id: division.id },
      cookie,
    });
    expect(res.status).toBe(204);
    expect(await prisma.team.count()).toBe(0);
    expect(await prisma.player.count()).toBe(0);
    expect(await prisma.match.count()).toBe(0);
    expect(await prisma.matchEvent.count()).toBe(0);
  });

  it('removes a season with its divisions', async () => {
    const { season } = await createLeague();
    const res = await call(deleteSeason, { method: 'DELETE', params: { id: season.id }, cookie });
    expect(res.status).toBe(204);
    expect(await prisma.division.count()).toBe(0);
  });
});
