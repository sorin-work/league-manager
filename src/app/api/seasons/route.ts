import { requireAdmin } from '@/lib/server/auth';
import { handle, json, readJson } from '@/lib/server/http';
import { createSeason, listSeasons } from '@/lib/server/services/seasons';
import { seasonSchema } from '@/lib/validation';

export const GET = handle(async () => json({ seasons: await listSeasons() }));

export const POST = handle(async (req) => {
  await requireAdmin(req);
  const input = seasonSchema.parse(await readJson(req));
  return json({ season: await createSeason(input) }, { status: 201 });
});
