import { requireAdmin } from '@/lib/server/auth';
import { handle, json, readJson } from '@/lib/server/http';
import { deleteSeason, getSeason, updateSeason } from '@/lib/server/services/seasons';
import { seasonUpdateSchema } from '@/lib/validation';

type Params = { id: string };

export const GET = handle<Params>(async (_req, { id }) => json({ season: await getSeason(id) }));

export const PATCH = handle<Params>(async (req, { id }) => {
  await requireAdmin(req);
  const input = seasonUpdateSchema.parse(await readJson(req));
  return json({ season: await updateSeason(id, input) });
});

export const DELETE = handle<Params>(async (req, { id }) => {
  await requireAdmin(req);
  await deleteSeason(id);
  return new Response(null, { status: 204 });
});
