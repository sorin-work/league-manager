import { beforeEach, describe, expect, it } from 'vitest';
import { DELETE as clear, POST as generate } from '@/app/api/divisions/[id]/fixtures/route';
import { GET as listMatches } from '@/app/api/divisions/[id]/matches/route';
import { GET as showMatch, PATCH as updateMatch } from '@/app/api/matches/[id]/route';
import { prisma } from '@/lib/server/db';
import { adminCookie, call, createLeague, resetDb } from './helpers';

let cookie: string;

beforeEach(async () => {
  await resetDb();
  cookie = await adminCookie();
});

const generateFor = (divisionId: string, body: object = {}) =>
  call(generate, {
    method: 'POST',
    params: { id: divisionId },
    body: { startDate: '2025-09-06', ...body },
    cookie,
  });

describe('POST /api/divisions/:id/fixtures', () => {
  it('creates a single round-robin', async () => {
    const { division } = await createLeague({ teams: 6 });
    const res = await generateFor(division.id);
    expect(res.status).toBe(201);
    expect(res.body).toEqual({ rounds: 5, matches: 15 });
    expect(await prisma.match.count({ where: { divisionId: division.id } })).toBe(15);
  });

  it('honours the division format unless overridden', async () => {
    const { division } = await createLeague({ teams: 4 });
    await prisma.division.update({ where: { id: division.id }, data: { format: 'DOUBLE' } });
    expect((await generateFor(division.id)).body.matches).toBe(12);
    await call(clear, { method: 'DELETE', params: { id: division.id }, cookie });
    expect((await generateFor(division.id, { format: 'SINGLE' })).body.matches).toBe(6);
  });

  it('handles an odd number of teams', async () => {
    const { division } = await createLeague({ teams: 5 });
    expect((await generateFor(division.id)).body).toEqual({ rounds: 5, matches: 10 });
  });

  it('refuses to generate twice', async () => {
    const { division } = await createLeague();
    await generateFor(division.id);
    const again = await generateFor(division.id);
    expect(again.status).toBe(409);
  });

  it('needs at least two teams', async () => {
    const { division } = await createLeague({ teams: 1 });
    const res = await generateFor(division.id);
    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/two teams/);
  });

  it('validates kick-off times', async () => {
    const { division } = await createLeague();
    const res = await generateFor(division.id, { kickoffTimes: ['9am'] });
    expect(res.status).toBe(400);
  });

  it('rejects unknown venues', async () => {
    const { division } = await createLeague();
    const res = await generateFor(division.id, { venueIds: ['nope'] });
    expect(res.status).toBe(400);
  });

  it("uses a team's home ground", async () => {
    const { division, teams } = await createLeague();
    const ground = await prisma.venue.create({ data: { name: 'The Meadow' } });
    await prisma.team.update({ where: { id: teams[0].id }, data: { homeVenueId: ground.id } });
    await generateFor(division.id);
    const home = await prisma.match.findMany({ where: { homeTeamId: teams[0].id } });
    expect(home.length).toBeGreaterThan(0);
    expect(home.every((m) => m.venueId === ground.id)).toBe(true);
  });

  it('requires an admin', async () => {
    const { division } = await createLeague();
    const res = await call(generate, {
      method: 'POST',
      params: { id: division.id },
      body: { startDate: '2025-09-06' },
    });
    expect(res.status).toBe(401);
  });
});

describe('DELETE /api/divisions/:id/fixtures', () => {
  it('clears fixtures before any result is in', async () => {
    const { division } = await createLeague();
    await generateFor(division.id);
    const res = await call(clear, { method: 'DELETE', params: { id: division.id }, cookie });
    expect(res.body).toEqual({ deleted: 6 });
  });

  it('keeps fixtures once a result has been entered', async () => {
    const { division } = await createLeague();
    await generateFor(division.id);
    const match = await prisma.match.findFirstOrThrow();
    await prisma.match.update({
      where: { id: match.id },
      data: { status: 'PLAYED', homeScore: 1, awayScore: 0 },
    });
    const res = await call(clear, { method: 'DELETE', params: { id: division.id }, cookie });
    expect(res.status).toBe(409);
  });
});

describe('matches', () => {
  it('lists matches with team names, filtered by round', async () => {
    const { division } = await createLeague();
    await generateFor(division.id);
    const all = await call(listMatches, { params: { id: division.id } });
    expect(all.body.matches).toHaveLength(6);
    const round2 = await call(listMatches, {
      params: { id: division.id },
      path: `/api/divisions/${division.id}/matches?round=2`,
    });
    expect(round2.body.matches).toHaveLength(2);
    expect(round2.body.matches[0].homeTeam.name).toEqual(expect.any(String));
  });

  it('rejects a bad round filter', async () => {
    const { division } = await createLeague();
    const res = await call(listMatches, {
      params: { id: division.id },
      path: `/api/divisions/${division.id}/matches?round=abc`,
    });
    expect(res.status).toBe(400);
  });

  it('shows a match with its season time zone', async () => {
    const { division } = await createLeague();
    await generateFor(division.id);
    const match = await prisma.match.findFirstOrThrow();
    const res = await call(showMatch, { params: { id: match.id } });
    expect(res.body.season.timezone).toBe('Europe/London');
    expect(res.body.division.id).toBe(division.id);
  });

  it('reschedules a match in the season time zone', async () => {
    const { division } = await createLeague();
    await generateFor(division.id);
    const match = await prisma.match.findFirstOrThrow();
    const res = await call(updateMatch, {
      method: 'PATCH',
      params: { id: match.id },
      body: { kickoffAt: '2025-10-04T14:30' },
      cookie,
    });
    expect(res.status).toBe(200);
    expect(res.body.match.kickoffAt).toBe('2025-10-04T13:30:00.000Z');
  });

  it('postpones a match without a new date', async () => {
    const { division } = await createLeague();
    await generateFor(division.id);
    const match = await prisma.match.findFirstOrThrow();
    const res = await call(updateMatch, {
      method: 'PATCH',
      params: { id: match.id },
      body: { status: 'POSTPONED', kickoffAt: null },
      cookie,
    });
    expect(res.body.match).toMatchObject({ status: 'POSTPONED', kickoffAt: null });
  });

  it('needs an admin to reschedule', async () => {
    const { division } = await createLeague();
    await generateFor(division.id);
    const match = await prisma.match.findFirstOrThrow();
    const res = await call(updateMatch, {
      method: 'PATCH',
      params: { id: match.id },
      body: { status: 'CANCELLED' },
    });
    expect(res.status).toBe(401);
  });
});
