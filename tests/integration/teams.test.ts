import { beforeEach, describe, expect, it } from 'vitest';
import { POST as createSeason } from '@/app/api/seasons/route';
import {
  GET as listDivisions,
  POST as createDivision,
} from '@/app/api/seasons/[id]/divisions/route';
import { DELETE as deleteDivision, PATCH as updateDivision } from '@/app/api/divisions/[id]/route';
import { GET as listTeams, POST as createTeam } from '@/app/api/divisions/[id]/teams/route';
import {
  DELETE as deleteTeam,
  GET as showTeam,
  PATCH as updateTeam,
} from '@/app/api/teams/[id]/route';
import { GET as listPlayers, POST as addPlayer } from '@/app/api/teams/[id]/players/route';
import { DELETE as deletePlayer, PATCH as updatePlayer } from '@/app/api/players/[id]/route';
import { GET as listVenues, POST as createVenue } from '@/app/api/venues/route';
import { DELETE as deleteVenue } from '@/app/api/venues/[id]/route';
import { prisma } from '@/lib/server/db';
import { adminCookie, call, resetDb } from './helpers';

let cookie: string;
let seasonId: string;

async function division(name = 'Premier') {
  const res = await call(createDivision, {
    method: 'POST',
    params: { id: seasonId },
    body: { name },
    cookie,
  });
  return res.body.division.id as string;
}

async function team(divisionId: string, name: string, extra: object = {}) {
  const res = await call(createTeam, {
    method: 'POST',
    params: { id: divisionId },
    body: { name, ...extra },
    cookie,
  });
  return res;
}

beforeEach(async () => {
  await resetDb();
  cookie = await adminCookie();
  const res = await call(createSeason, {
    method: 'POST',
    body: { name: 'Autumn 2025', startDate: '2025-09-06', endDate: '2025-12-13' },
    cookie,
  });
  seasonId = res.body.season.id;
});

describe('divisions', () => {
  it('creates divisions and lists them by sort order', async () => {
    await call(createDivision, {
      method: 'POST',
      params: { id: seasonId },
      body: { name: 'Division Two', sortOrder: 2 },
      cookie,
    });
    await call(createDivision, {
      method: 'POST',
      params: { id: seasonId },
      body: { name: 'Division One', sortOrder: 1, format: 'DOUBLE' },
      cookie,
    });
    const res = await call(listDivisions, { params: { id: seasonId } });
    expect(res.body.divisions.map((d: { name: string }) => d.name)).toEqual([
      'Division One',
      'Division Two',
    ]);
    expect(res.body.divisions[0]).toMatchObject({ slug: 'division-one', format: 'DOUBLE' });
  });

  it('404s for an unknown season', async () => {
    const res = await call(createDivision, {
      method: 'POST',
      params: { id: 'nope' },
      body: { name: 'X' },
      cookie,
    });
    expect(res.status).toBe(404);
  });

  it('rejects an unknown fixture format', async () => {
    const res = await call(createDivision, {
      method: 'POST',
      params: { id: seasonId },
      body: { name: 'Cup', format: 'KNOCKOUT' },
      cookie,
    });
    expect(res.status).toBe(400);
  });

  it('renames and deletes a division', async () => {
    const id = await division();
    const renamed = await call(updateDivision, {
      method: 'PATCH',
      params: { id },
      body: { name: 'Championship' },
      cookie,
    });
    expect(renamed.body.division.slug).toBe('championship');
    expect((await call(deleteDivision, { method: 'DELETE', params: { id }, cookie })).status).toBe(
      204,
    );
  });
});

describe('teams', () => {
  it('creates teams with an upper-case short name', async () => {
    const d = await division();
    const res = await team(d, 'Riverside Rovers', { shortName: 'rov' });
    expect(res.status).toBe(201);
    expect(res.body.team).toMatchObject({ slug: 'riverside-rovers', shortName: 'ROV' });
  });

  it('lists teams alphabetically with their player count', async () => {
    const d = await division();
    await team(d, 'Woodford');
    const { body } = await team(d, 'Ashby');
    await call(addPlayer, {
      method: 'POST',
      params: { id: body.team.id },
      body: { name: 'Sam Hill' },
      cookie,
    });
    const res = await call(listTeams, { params: { id: d } });
    expect(res.body.teams.map((t: { name: string }) => t.name)).toEqual(['Ashby', 'Woodford']);
    expect(res.body.teams[0]._count.players).toBe(1);
  });

  it('makes readable slugs for names with accents', async () => {
    const res = await team(await division(), 'Ştiinţa Mioveni');
    expect(res.body.team.slug).toBe('stiinta-mioveni');
  });

  it('allows the same team name in two divisions', async () => {
    const a = await team(await division('One'), 'United');
    const b = await team(await division('Two'), 'United');
    expect(a.body.team.slug).toBe('united');
    expect(b.body.team.slug).toBe('united');
  });

  it('rejects an unknown home venue', async () => {
    const res = await team(await division(), 'United', { homeVenueId: 'nope' });
    expect(res.status).toBe(400);
  });

  it('shows a team with its division', async () => {
    const d = await division();
    const { body } = await team(d, 'United');
    const res = await call(showTeam, { params: { id: body.team.id } });
    expect(res.body.division).toMatchObject({ id: d, name: 'Premier' });
    expect(res.body.team.players).toEqual([]);
  });

  it('updates a team', async () => {
    const { body } = await team(await division(), 'United');
    const res = await call(updateTeam, {
      method: 'PATCH',
      params: { id: body.team.id },
      body: { shortName: '' },
      cookie,
    });
    expect(res.body.team.shortName).toBeNull();
  });

  it('refuses to delete a team that has fixtures', async () => {
    const d = await division();
    const home = (await team(d, 'Home')).body.team.id;
    const away = (await team(d, 'Away')).body.team.id;
    await prisma.match.create({
      data: { divisionId: d, round: 1, homeTeamId: home, awayTeamId: away },
    });
    const res = await call(deleteTeam, { method: 'DELETE', params: { id: home }, cookie });
    expect(res.status).toBe(409);
  });

  it('requires an admin', async () => {
    const res = await call(createTeam, {
      method: 'POST',
      params: { id: await division() },
      body: { name: 'Sneaky' },
    });
    expect(res.status).toBe(401);
  });
});

describe('rosters', () => {
  let teamId: string;

  beforeEach(async () => {
    teamId = (await team(await division(), 'United')).body.team.id;
  });

  it('adds players and lists them by shirt number', async () => {
    for (const [name, shirtNumber] of [
      ['Keeper', 1],
      ['Striker', 9],
      ['Defender', 4],
    ] as const) {
      await call(addPlayer, {
        method: 'POST',
        params: { id: teamId },
        body: { name, shirtNumber },
        cookie,
      });
    }
    const res = await call(listPlayers, { params: { id: teamId } });
    expect(res.body.players.map((p: { shirtNumber: number }) => p.shirtNumber)).toEqual([1, 4, 9]);
  });

  it('rejects a shirt number that is already taken', async () => {
    const body = { name: 'A', shirtNumber: 7 };
    await call(addPlayer, { method: 'POST', params: { id: teamId }, body, cookie });
    const res = await call(addPlayer, {
      method: 'POST',
      params: { id: teamId },
      body: { name: 'B', shirtNumber: 7 },
      cookie,
    });
    expect(res.status).toBe(409);
    expect(res.body.error).toMatch(/Shirt number 7/);
  });

  it('allows several players without a number', async () => {
    await call(addPlayer, { method: 'POST', params: { id: teamId }, body: { name: 'A' }, cookie });
    const res = await call(addPlayer, {
      method: 'POST',
      params: { id: teamId },
      body: { name: 'B' },
      cookie,
    });
    expect(res.status).toBe(201);
  });

  it('rejects shirt numbers out of range', async () => {
    const res = await call(addPlayer, {
      method: 'POST',
      params: { id: teamId },
      body: { name: 'A', shirtNumber: 100 },
      cookie,
    });
    expect(res.status).toBe(400);
  });

  it('updates and removes players', async () => {
    const { body } = await call(addPlayer, {
      method: 'POST',
      params: { id: teamId },
      body: { name: 'A', shirtNumber: 3 },
      cookie,
    });
    const id = body.player.id;
    const updated = await call(updatePlayer, {
      method: 'PATCH',
      params: { id },
      body: { shirtNumber: 5 },
      cookie,
    });
    expect(updated.body.player.shirtNumber).toBe(5);
    expect((await call(deletePlayer, { method: 'DELETE', params: { id }, cookie })).status).toBe(
      204,
    );
    expect((await call(listPlayers, { params: { id: teamId } })).body.players).toEqual([]);
  });
});

describe('venues', () => {
  it('creates and lists venues', async () => {
    await call(createVenue, {
      method: 'POST',
      body: { name: 'Victoria Park', address: '' },
      cookie,
    });
    await call(createVenue, { method: 'POST', body: { name: 'Albert Rec' }, cookie });
    const res = await call(listVenues);
    expect(res.body.venues.map((v: { name: string }) => v.name)).toEqual([
      'Albert Rec',
      'Victoria Park',
    ]);
    expect(res.body.venues[1].address).toBeNull();
  });

  it('keeps teams when their home venue is deleted', async () => {
    const venue = await call(createVenue, { method: 'POST', body: { name: 'Albert Rec' }, cookie });
    const { body } = await team(await division(), 'United', { homeVenueId: venue.body.venue.id });
    await call(deleteVenue, { method: 'DELETE', params: { id: venue.body.venue.id }, cookie });
    const res = await call(showTeam, { params: { id: body.team.id } });
    expect(res.body.team.homeVenueId).toBeNull();
  });
});
