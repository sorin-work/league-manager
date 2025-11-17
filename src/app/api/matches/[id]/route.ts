import { requireAdmin } from '@/lib/server/auth';
import { handle, json, readJson } from '@/lib/server/http';
import { getMatch, updateMatchSchedule } from '@/lib/server/services/matches';
import { matchUpdateSchema } from '@/lib/validation';

type Params = { id: string };

export const GET = handle<Params>(async (_req, { id }) => {
  const { division, ...match } = await getMatch(id);
  return json({
    match,
    division: { id: division.id, name: division.name, slug: division.slug },
    season: {
      id: division.season.id,
      name: division.season.name,
      timezone: division.season.timezone,
    },
  });
});

export const PATCH = handle<Params>(async (req, { id }) => {
  await requireAdmin(req);
  const input = matchUpdateSchema.parse(await readJson(req));
  return json({ match: await updateMatchSchedule(id, input) });
});
