import { toCsv } from '@/lib/domain/csv';
import { handle } from '@/lib/server/http';
import { getDivision } from '@/lib/server/services/divisions';
import { getDivisionStandings } from '@/lib/server/services/standings';

type Params = { id: string };

export const GET = handle<Params>(async (_req, { id }) => {
  const division = await getDivision(id);
  const { standings } = await getDivisionStandings(id);
  const csv = toCsv([
    ['Pos', 'Team', 'P', 'W', 'D', 'L', 'GF', 'GA', 'GD', 'Adj', 'Pts'],
    ...standings.map((r) => [
      r.position,
      r.name,
      r.played,
      r.won,
      r.drawn,
      r.lost,
      r.goalsFor,
      r.goalsAgainst,
      r.goalDifference,
      r.adjustment,
      r.points,
    ]),
  ]);
  return new Response(csv, {
    headers: {
      'content-type': 'text/csv; charset=utf-8',
      'content-disposition': `attachment; filename="${division.season.slug}-${division.slug}.csv"`,
    },
  });
});
