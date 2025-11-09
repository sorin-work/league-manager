import { requireAdmin } from '@/lib/server/auth';
import { handle, json, readJson } from '@/lib/server/http';
import { addPlayer, listPlayers } from '@/lib/server/services/players';
import { playerSchema } from '@/lib/validation';

type Params = { id: string };

export const GET = handle<Params>(async (_req, { id }) => json({ players: await listPlayers(id) }));

export const POST = handle<Params>(async (req, { id }) => {
  await requireAdmin(req);
  const input = playerSchema.parse(await readJson(req));
  return json({ player: await addPlayer(id, input) }, { status: 201 });
});
