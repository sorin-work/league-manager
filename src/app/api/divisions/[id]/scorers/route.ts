import { handle, json } from '@/lib/server/http';
import { getDivisionScorers } from '@/lib/server/services/scorers';

type Params = { id: string };

export const GET = handle<Params>(async (req, { id }) => {
  const limit = Number(req.nextUrl.searchParams.get('limit') ?? 20);
  const safeLimit = Number.isInteger(limit) && limit > 0 ? Math.min(limit, 100) : 20;
  return json({ scorers: await getDivisionScorers(id, safeLimit) });
});
