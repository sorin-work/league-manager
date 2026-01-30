import { optionalAdmin, requireAdmin } from '@/lib/server/auth';
import { handle, json, readJson } from '@/lib/server/http';
import { deleteSeason, getSeason, updateSeason } from '@/lib/server/services/seasons';
import { seasonUpdateSchema } from '@/lib/validation';

type Params = { id: string };

export const GET = handle<Params>(async (req, { id }) => {
  const admin = await optionalAdmin(req);
  return json({ season: await getSeason(id, { includeDrafts: admin !== null }) });
});

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
