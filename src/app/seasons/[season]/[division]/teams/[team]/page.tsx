import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { MatchList } from '@/components/MatchList';
import { listTeamMatches } from '@/lib/server/services/matches';
import { getDivisionStandings } from '@/lib/server/services/standings';
import { getTeamBySlugs } from '@/lib/server/services/teams';

type Props = { params: Promise<{ season: string; division: string; team: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const p = await params;
  const team = await getTeamBySlugs(p.season, p.division, p.team);
  return { title: team?.name ?? 'Team not found' };
}

export default async function TeamPage({ params }: Props) {
  const p = await params;
  const team = await getTeamBySlugs(p.season, p.division, p.team);
  if (!team) notFound();
  const { division } = team;
  const { season } = division;

  const [matches, { standings }] = await Promise.all([
    listTeamMatches(team.id),
    getDivisionStandings(division.id),
  ]);
  const row = standings.find((r) => r.teamId === team.id);
  const divisionHref = `/seasons/${season.slug}/${division.slug}`;

  return (
    <div className="container">
      <div className="breadcrumbs">
        <Link href={`/seasons/${season.slug}`}>{season.name}</Link> /{' '}
        <Link href={divisionHref}>{division.name}</Link>
      </div>
      <h1>{team.name}</h1>
      {team.homeVenue && <p className="muted">Home ground: {team.homeVenue.name}</p>}
      <p className="small">
        <a href={`/api/teams/${team.id}/calendar`} download={`${team.slug}.ics`}>
          Add fixtures to your calendar
        </a>{' '}
        <span className="muted">(.ics, updates when fixtures change)</span>
      </p>

      {row && (
        <div className="stats">
          <div className="stat">
            <strong>{row.position}</strong>
            <span className="muted small">Position</span>
          </div>
          <div className="stat">
            <strong>{row.points}</strong>
            <span className="muted small">Points</span>
          </div>
          <div className="stat">
            <strong>
              {row.won}-{row.drawn}-{row.lost}
            </strong>
            <span className="muted small">W-D-L</span>
          </div>
          <div className="stat">
            <strong>
              {row.goalsFor}:{row.goalsAgainst}
            </strong>
            <span className="muted small">Goals</span>
          </div>
        </div>
      )}

      <div className="two-col">
        <div>
          <section className="card">
            <h2>Fixtures</h2>
            <MatchList
              matches={matches.filter((m) => m.status !== 'PLAYED')}
              timeZone={season.timezone}
              emptyText="No fixtures left."
            />
          </section>
          <section className="card">
            <h2>Results</h2>
            <MatchList
              matches={matches.filter((m) => m.status === 'PLAYED')}
              timeZone={season.timezone}
              newestFirst
              emptyText="No results yet."
            />
          </section>
        </div>
        <section className="card">
          <h2>Squad</h2>
          {team.players.length === 0 ? (
            <p className="muted">No players registered yet.</p>
          ) : (
            <ul className="roster">
              {team.players.map((pl) => (
                <li key={pl.id}>
                  <span className="shirt">{pl.shirtNumber ?? ''}</span>
                  <span>{pl.name}</span>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </div>
  );
}
