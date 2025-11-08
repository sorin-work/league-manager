import { requireAdmin } from '@/lib/server/auth';
import { handle, json, readJson } from '@/lib/server/http';
import { createTeam, listTeams } from '@/lib/server/services/teams';
import { teamSchema } from '@/lib/validation';

type Params = { id: string };

export const GET = handle<Params>(async (_req, { id }) => json({ teams: await listTeams(id) }));

export const POST = handle<Params>(async (req, { id }) => {
  await requireAdmin(req);
  const input = teamSchema.parse(await readJson(req));
  return json({ team: await createTeam(id, input) }, { status: 201 });
});
