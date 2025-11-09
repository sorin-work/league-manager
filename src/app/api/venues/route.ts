import { requireAdmin } from '@/lib/server/auth';
import { handle, json, readJson } from '@/lib/server/http';
import { createVenue, listVenues } from '@/lib/server/services/venues';
import { venueSchema } from '@/lib/validation';

export const GET = handle(async () => json({ venues: await listVenues() }));

export const POST = handle(async (req) => {
  await requireAdmin(req);
  const input = venueSchema.parse(await readJson(req));
  return json({ venue: await createVenue(input) }, { status: 201 });
});
