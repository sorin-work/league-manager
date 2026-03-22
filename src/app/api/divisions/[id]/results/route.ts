import { parsePage } from '@/lib/domain/pagination';
import { handle, json } from '@/lib/server/http';
import { listDivisionResults } from '@/lib/server/services/matches';

type Params = { id: string };

export const GET = handle<Params>(async (req, { id }) =>
  json(await listDivisionResults(id, parsePage(req.nextUrl.searchParams))),
);
