import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import type { EventType } from '@/lib/domain/events';
import { formatKickoff } from '@/lib/domain/time';
import { getMatchDetails } from '@/lib/server/services/matches';

type Props = { params: Promise<{ id: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const match = await getMatchDetails((await params).id);
  return { title: match ? `${match.homeTeam.name} v ${match.awayTeam.name}` : 'Match not found' };
}

function EventLabel({ type, name }: { type: EventType; name: string }) {
  switch (type) {
    case 'GOAL':
      return <>⚽ {name}</>;
    case 'PENALTY_GOAL':
      return <>⚽ {name} (pen)</>;
    case 'OWN_GOAL':
      return <>⚽ {name} (og)</>;
    case 'YELLOW_CARD':
      return (
        <>
          <span className="card-yellow" aria-label="Yellow card" />
          {name}
        </>
      );
    case 'RED_CARD':
      return (
        <>
          <span className="card-red" aria-label="Red card" />
          {name}
        </>
      );
  }
}

export default async function MatchPage({ params }: Props) {
  const match = await getMatchDetails((await params).id);
  if (!match || match.division.season.status === 'DRAFT') notFound();
  const { division } = match;
  const { season } = division;
  const played = match.status === 'PLAYED';

  // an own goal is shown on the side that benefited from it
  const sideOf = (teamId: string, type: EventType) => {
    const own = teamId === match.homeTeamId ? 'home' : 'away';
    if (type !== 'OWN_GOAL') return own;
    return own === 'home' ? 'away' : 'home';
  };

  return (
    <div className="container">
      <div className="breadcrumbs">
        <Link href={`/seasons/${season.slug}`}>{season.name}</Link> /{' '}
        <Link href={`/seasons/${season.slug}/${division.slug}`}>{division.name}</Link> / Round{' '}
        {match.round}
      </div>

      <section className="card scoreboard">
        <div className="team-name">{match.homeTeam.name}</div>
        <div className="big-score">{played ? `${match.homeScore} – ${match.awayScore}` : 'v'}</div>
        <div className="team-name">{match.awayTeam.name}</div>
      </section>

      <section className="card">
        <p>
          <strong>Kick-off:</strong> {formatKickoff(match.kickoffAt, season.timezone)}
          {match.status === 'POSTPONED' && <span className="badge warn"> Postponed</span>}
          {match.status === 'CANCELLED' && <span className="badge danger"> Cancelled</span>}
          {match.walkover && <span className="badge"> Walkover</span>}
        </p>
        <p>
          <strong>Venue:</strong> {match.venue?.name ?? 'To be confirmed'}
        </p>
      </section>

      {played && !match.walkover && (
        <section className="card">
          <h2>Match events</h2>
          {match.events.length === 0 ? (
            <p className="muted">No scorers or cards were recorded.</p>
          ) : (
            <ul className="events">
              {match.events.map((e) => {
                const side = sideOf(e.teamId, e.type);
                const label = <EventLabel type={e.type} name={e.player.name} />;
                return (
                  <li key={e.id}>
                    <span className="home-side">{side === 'home' ? label : null}</span>
                    <span className="minute">{e.minute ? `${e.minute}'` : ''}</span>
                    <span>{side === 'away' ? label : null}</span>
                  </li>
                );
              })}
            </ul>
          )}
        </section>
      )}
    </div>
  );
}
