import { requireAdmin } from '@/lib/server/auth';
import { handle, json, readJson } from '@/lib/server/http';
import { deleteDivision, getDivision, updateDivision } from '@/lib/server/services/divisions';
import { divisionUpdateSchema } from '@/lib/validation';

type Params = { id: string };

export const GET = handle<Params>(async (_req, { id }) => {
  const { season, ...division } = await getDivision(id);
  return json({ division, season: { id: season.id, name: season.name, slug: season.slug } });
});

export const PATCH = handle<Params>(async (req, { id }) => {
  await requireAdmin(req);
  const input = divisionUpdateSchema.parse(await readJson(req));
  return json({ division: await updateDivision(id, input) });
});

export const DELETE = handle<Params>(async (req, { id }) => {
  await requireAdmin(req);
  await deleteDivision(id);
  return new Response(null, { status: 204 });
});
