import { requireAdmin } from '@/lib/server/auth';
import { handle, json, readJson } from '@/lib/server/http';
import { clearResult, saveResult } from '@/lib/server/services/results';
import { resultSchema } from '@/lib/validation';

type Params = { id: string };

export const PUT = handle<Params>(async (req, { id }) => {
  const input = resultSchema.parse(await readJson(req));
  return json({ match: await saveResult(id, input) });
});

export const DELETE = handle<Params>(async (req, { id }) => {
  await requireAdmin(req);
  return json({ match: await clearResult(id) });
});
