import { requireAdmin } from '@/lib/server/auth';
import { handle, json, readJson } from '@/lib/server/http';
import { awardWalkover } from '@/lib/server/services/results';
import { walkoverSchema } from '@/lib/validation';

type Params = { id: string };

export const POST = handle<Params>(async (req, { id }) => {
  await requireAdmin(req);
  const input = walkoverSchema.parse(await readJson(req));
  return json({ match: await awardWalkover(id, input) });
});
