import { activeSuspensions } from '@/lib/domain/discipline';
import { handle, json } from '@/lib/server/http';
import { getDivisionSuspensions } from '@/lib/server/services/discipline';

type Params = { id: string };

export const GET = handle<Params>(async (req, { id }) => {
  const all = await getDivisionSuspensions(id);
  const showAll = req.nextUrl.searchParams.get('all') === 'true';
  return json({ suspensions: showAll ? all : activeSuspensions(all) });
});
