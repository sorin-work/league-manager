import { requireAdmin } from '@/lib/server/auth';
import { handle, json, readJson } from '@/lib/server/http';
import { deletePlayer, updatePlayer } from '@/lib/server/services/players';
import { playerUpdateSchema } from '@/lib/validation';

type Params = { id: string };

export const PATCH = handle<Params>(async (req, { id }) => {
  await requireAdmin(req);
  const input = playerUpdateSchema.parse(await readJson(req));
  return json({ player: await updatePlayer(id, input) });
});

export const DELETE = handle<Params>(async (req, { id }) => {
  await requireAdmin(req);
  await deletePlayer(id);
  return new Response(null, { status: 204 });
});
