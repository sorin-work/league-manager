import { handle, json, positiveInt } from '@/lib/server/http';
import { listDivisionMatches } from '@/lib/server/services/matches';

type Params = { id: string };

export const GET = handle<Params>(async (req, { id }) => {
  const roundParam = req.nextUrl.searchParams.get('round');
  const round = roundParam ? positiveInt(roundParam, 'round') : undefined;
  return json({ matches: await listDivisionMatches(id, { round }) });
});
