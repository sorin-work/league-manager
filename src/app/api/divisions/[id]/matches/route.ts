import { badRequest, handle, json } from '@/lib/server/http';
import { listDivisionMatches } from '@/lib/server/services/matches';

type Params = { id: string };

export const GET = handle<Params>(async (req, { id }) => {
  const roundParam = req.nextUrl.searchParams.get('round');
  const round = roundParam ? Number(roundParam) : undefined;
  if (round !== undefined && (!Number.isInteger(round) || round < 1)) {
    throw badRequest('round must be a positive whole number');
  }
  return json({ matches: await listDivisionMatches(id, { round }) });
});
