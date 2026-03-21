import { buildCalendar } from '@/lib/domain/ics';
import { handle, notFound } from '@/lib/server/http';
import { listTeamMatches } from '@/lib/server/services/matches';
import { getTeam } from '@/lib/server/services/teams';

type Params = { id: string };

const MATCH_LENGTH_MINUTES = 105;

export const GET = handle<Params>(async (_req, { id }) => {
  const team = await getTeam(id);
  if (team.division.season.status === 'DRAFT') throw notFound('Team not found');
  const matches = await listTeamMatches(team.id);

  const events = matches
    .filter((m) => m.kickoffAt)
    .map((m) => ({
      uid: `${m.id}@league-manager`,
      start: m.kickoffAt!,
      durationMinutes: MATCH_LENGTH_MINUTES,
      summary:
        m.status === 'PLAYED'
          ? `${m.homeTeam.name} ${m.homeScore}–${m.awayScore} ${m.awayTeam.name}`
          : `${m.homeTeam.name} v ${m.awayTeam.name}`,
      location: m.venue?.name,
      description: `${team.division.name}, round ${m.round}`,
      cancelled: m.status === 'CANCELLED',
    }));

  const body = buildCalendar(`${team.name} (${team.division.name})`, events);
  return new Response(body, {
    headers: {
      'content-type': 'text/calendar; charset=utf-8',
      'content-disposition': `inline; filename="${team.slug}.ics"`,
      'cache-control': 'public, max-age=900',
    },
  });
});
