import { beforeEach, describe, expect, it } from 'vitest';
import { GET as results } from '@/app/api/divisions/[id]/results/route';
import { prisma } from '@/lib/server/db';
import { call, createLeague, resetDb } from './helpers';

let divisionId: string;

beforeEach(async () => {
  await resetDb();
  const { division, teams } = await createLeague({ teams: 2 });
  divisionId = division.id;
  // 25 results between the same two teams, one a day
  for (let i = 0; i < 25; i++) {
    await prisma.match.create({
      data: {
        divisionId,
        round: i + 1,
        homeTeamId: teams[i % 2].id,
        awayTeamId: teams[(i + 1) % 2].id,
        kickoffAt: new Date(Date.UTC(2025, 8, 1 + i, 10)),
        status: 'PLAYED',
        homeScore: i % 4,
        awayScore: 1,
      },
    });
  }
});

const page = (query: string) =>
  call(results, {
    params: { id: divisionId },
    path: `/api/divisions/${divisionId}/results?${query}`,
  });

describe('GET /api/divisions/:id/results', () => {
  it('starts with the most recent results', async () => {
    const res = await page('page=1');
    expect(res.body).toMatchObject({ page: 1, pageSize: 10, total: 25, totalPages: 3 });
    expect(res.body.results[0].round).toBe(25);
  });

  it('reaches the oldest results on the last page', async () => {
    const res = await page('page=3');
    expect(res.body.page).toBe(3);
    expect(res.body.results.map((m: { round: number }) => m.round)).toEqual([5, 4, 3, 2, 1]);
  });

  it('shows the last page for a page number that is too high', async () => {
    expect((await page('page=99')).body.page).toBe(3);
  });

  it('honours the page size', async () => {
    const res = await page('page=2&pageSize=20');
    expect(res.body.results).toHaveLength(5);
  });
});
