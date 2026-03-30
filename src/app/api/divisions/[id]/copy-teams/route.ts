import { requireAdmin } from '@/lib/server/auth';
import { handle, json, readJson } from '@/lib/server/http';
import { copyTeams } from '@/lib/server/services/teams';
import { copyTeamsSchema } from '@/lib/validation';

type Params = { id: string };

export const POST = handle<Params>(async (req, { id }) => {
  await requireAdmin(req);
  const input = copyTeamsSchema.parse(await readJson(req));
  return json(await copyTeams(id, input.fromDivisionId, input.includePlayers), { status: 201 });
});
