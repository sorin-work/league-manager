import { requireAdmin } from '@/lib/server/auth';
import { handle, json, readJson } from '@/lib/server/http';
import { importRoster } from '@/lib/server/services/players';
import { rosterImportSchema } from '@/lib/validation';

type Params = { id: string };

export const POST = handle<Params>(async (req, { id }) => {
  await requireAdmin(req);
  const input = rosterImportSchema.parse(await readJson(req));
  return json(await importRoster(id, input.csv, { replace: input.replace }), { status: 201 });
});
