import Link from 'next/link';
import { formatKickoff } from '@/lib/domain/time';
import type { listUpcomingMatches } from '@/lib/server/services/matches';

type Upcoming = Awaited<ReturnType<typeof listUpcomingMatches>>;

export function UpcomingMatches({ matches }: { matches: Upcoming }) {
  if (matches.length === 0) return null;

  return (
    <section className="card">
      <h2>Coming up</h2>
      <ul className="upcoming">
        {matches.map((m) => (
          <li key={m.id}>
            <span className="muted small">
              {formatKickoff(m.kickoffAt, m.division.season.timezone)}
            </span>
            <Link href={`/matches/${m.id}`}>
              {m.homeTeam.name} v {m.awayTeam.name}
            </Link>
            <span className="muted small">
              {m.division.name}
              {m.venue ? ` · ${m.venue.name}` : ''}
            </span>
          </li>
        ))}
      </ul>
    </section>
  );
}
