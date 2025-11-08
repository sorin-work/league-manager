import { requireAdmin } from '@/lib/server/auth';
import { handle, json, readJson } from '@/lib/server/http';
import { createDivision, listDivisions } from '@/lib/server/services/divisions';
import { divisionSchema } from '@/lib/validation';

type Params = { id: string };

export const GET = handle<Params>(async (_req, { id }) =>
  json({ divisions: await listDivisions(id) }),
);

export const POST = handle<Params>(async (req, { id }) => {
  await requireAdmin(req);
  const input = divisionSchema.parse(await readJson(req));
  return json({ division: await createDivision(id, input) }, { status: 201 });
});
