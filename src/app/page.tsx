import Link from 'next/link';
import { UpcomingMatches } from '@/components/UpcomingMatches';
import { formatDateRange, plural } from '@/lib/format';
import { listUpcomingMatches } from '@/lib/server/services/matches';
import { listSeasonsWithDivisions } from '@/lib/server/services/seasons';

export default async function HomePage() {
  const [seasons, upcoming] = await Promise.all([
    listSeasonsWithDivisions(),
    listUpcomingMatches(),
  ]);

  return (
    <div className="container">
      <UpcomingMatches matches={upcoming} />
      <h1>Seasons</h1>
      {seasons.length === 0 ? (
        <div className="card empty">No seasons yet. Check back once the league has started.</div>
      ) : (
        <div className="grid">
          {seasons.map((season) => (
            <section key={season.id} className="card">
              <h2>
                <Link href={`/seasons/${season.slug}`}>{season.name}</Link>
              </h2>
              <p className="muted small">{formatDateRange(season.startDate, season.endDate)}</p>
              {season.divisions.length === 0 ? (
                <p className="muted">Divisions will be announced soon.</p>
              ) : (
                <ul>
                  {season.divisions.map((d) => (
                    <li key={d.id}>
                      <Link href={`/seasons/${season.slug}/${d.slug}`}>{d.name}</Link>{' '}
                      <span className="muted small">({plural(d._count.teams, 'team')})</span>
                    </li>
                  ))}
                </ul>
              )}
            </section>
          ))}
        </div>
      )}
    </div>
  );
}
