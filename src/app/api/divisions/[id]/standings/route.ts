import { handle, json } from '@/lib/server/http';
import { getDivisionStandings } from '@/lib/server/services/standings';

type Params = { id: string };

export const GET = handle<Params>(async (_req, { id }) => json(await getDivisionStandings(id)));
