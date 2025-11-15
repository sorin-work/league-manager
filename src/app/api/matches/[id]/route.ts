import { handle, json } from '@/lib/server/http';
import { getMatch } from '@/lib/server/services/matches';

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
