import { requireAdmin } from '@/lib/server/auth';
import { handle, json, readJson } from '@/lib/server/http';
import { deleteTeam, getTeam, updateTeam } from '@/lib/server/services/teams';
import { teamUpdateSchema } from '@/lib/validation';

type Params = { id: string };

export const GET = handle<Params>(async (_req, { id }) => {
  const { division, ...team } = await getTeam(id);
  return json({ team, division: { id: division.id, name: division.name, slug: division.slug } });
});

export const PATCH = handle<Params>(async (req, { id }) => {
  await requireAdmin(req);
  const input = teamUpdateSchema.parse(await readJson(req));
  return json({ team: await updateTeam(id, input) });
});

export const DELETE = handle<Params>(async (req, { id }) => {
  await requireAdmin(req);
  await deleteTeam(id);
  return new Response(null, { status: 204 });
});
