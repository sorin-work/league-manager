import { beforeEach, describe, expect, it } from 'vitest';
import { prisma } from '@/lib/server/db';
import { getMatchday } from '@/lib/server/services/matchday';
import { createLeague, resetDb } from './helpers';

beforeEach(resetDb);

async function match(
  league: Awaited<ReturnType<typeof createLeague>>,
  kickoffAt: string,
  round = 1,
) {
  return prisma.match.create({
    data: {
      divisionId: league.division.id,
      round,
      homeTeamId: league.teams[0].id,
      awayTeamId: league.teams[1].id,
      kickoffAt: new Date(kickoffAt),
    },
  });
}

describe('getMatchday', () => {
  it('lists the matches of a day and the match days around it', async () => {
    const league = await createLeague({ teams: 2 });
    await match(league, '2025-09-07T09:00:00Z', 1);
    const today = await match(league, '2025-09-14T09:00:00Z', 2);
    await match(league, '2025-09-21T09:00:00Z', 3);
    const day = await getMatchday('2025-09-14');
    expect(day.matches.map((m) => m.id)).toEqual([today.id]);
    expect(day.previous).toBe('2025-09-07');
    expect(day.next).toBe('2025-09-21');
  });

  it("uses each season's time zone for the date", async () => {
    const auckland = await createLeague({ teams: 2, season: { timezone: 'Pacific/Auckland' } });
    // 20:00 UTC on the 13th is 08:00 on the 14th in Auckland
    const early = await match(auckland, '2025-09-13T20:00:00Z');
    expect((await getMatchday('2025-09-14')).matches.map((m) => m.id)).toEqual([early.id]);
    expect((await getMatchday('2025-09-13')).matches).toEqual([]);
  });

  it('leaves out draft seasons', async () => {
    const draft = await createLeague({ teams: 2, season: { status: 'DRAFT' } });
    await match(draft, '2025-09-14T09:00:00Z');
    const day = await getMatchday('2025-09-14');
    expect(day).toMatchObject({ matches: [], previous: null, next: null });
  });
});
