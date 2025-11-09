import { requireAdmin } from '@/lib/server/auth';
import { handle, json, readJson } from '@/lib/server/http';
import { deleteVenue, getVenue, updateVenue } from '@/lib/server/services/venues';
import { venueUpdateSchema } from '@/lib/validation';

type Params = { id: string };

export const GET = handle<Params>(async (_req, { id }) => json({ venue: await getVenue(id) }));

export const PATCH = handle<Params>(async (req, { id }) => {
  await requireAdmin(req);
  const input = venueUpdateSchema.parse(await readJson(req));
  return json({ venue: await updateVenue(id, input) });
});

export const DELETE = handle<Params>(async (req, { id }) => {
  await requireAdmin(req);
  await deleteVenue(id);
  return new Response(null, { status: 204 });
});
