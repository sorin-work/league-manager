import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ResultForm } from '@/components/admin/ResultForm';
import { ScheduleForm } from '@/components/admin/ScheduleForm';
import { WalkoverForm } from '@/components/admin/WalkoverForm';
import { formatKickoff, toLocalInput } from '@/lib/domain/time';
import { suspendedFor } from '@/lib/domain/discipline';
import { prisma } from '@/lib/server/db';
import { getDivisionSuspensions } from '@/lib/server/services/discipline';
import { getMatchDetails } from '@/lib/server/services/matches';
import { listVenues } from '@/lib/server/services/venues';

type Props = { params: Promise<{ id: string }> };

export default async function AdminMatchPage({ params }: Props) {
  const match = await getMatchDetails((await params).id);
  if (!match) notFound();
  const [venues, players, suspensions] = await Promise.all([
    listVenues(),
    prisma.player.findMany({
      where: { teamId: { in: [match.homeTeamId, match.awayTeamId] } },
      orderBy: [{ shirtNumber: 'asc' }, { name: 'asc' }],
      select: { id: true, name: true, shirtNumber: true, teamId: true },
    }),
    getDivisionSuspensions(match.divisionId),
  ]);
  const suspended = suspendedFor(suspensions, match.id);
  const squad = (teamId: string) => players.filter((p) => p.teamId === teamId);
  const { division } = match;
  const tz = division.season.timezone;

  return (
    <>
      <div className="breadcrumbs">
        <Link href={`/admin/divisions/${division.id}`}>{division.name}</Link> / Round {match.round}
      </div>
      <h1>
        {match.homeTeam.name} v {match.awayTeam.name}
      </h1>
      <p className="muted">
        {formatKickoff(match.kickoffAt, tz)} ·{' '}
        <Link href={`/matches/${match.id}`}>Public page</Link>
      </p>

      <section className="card">
        <h2>Schedule</h2>
        <ScheduleForm
          matchId={match.id}
          kickoffLocal={match.kickoffAt ? toLocalInput(match.kickoffAt, tz) : ''}
          venueId={match.venueId}
          status={match.status}
          referee={match.referee}
          notes={match.notes}
          timeZone={tz}
          venues={venues}
        />
      </section>

      {match.status !== 'CANCELLED' && (
        <section className="card">
          <h2>Result</h2>
          <ResultForm
            matchId={match.id}
            home={{ ...match.homeTeam, players: squad(match.homeTeamId) }}
            away={{ ...match.awayTeam, players: squad(match.awayTeamId) }}
            played={match.status === 'PLAYED'}
            suspendedIds={[...suspended]}
            homeScore={match.homeScore}
            awayScore={match.awayScore}
            events={match.events.map((e) => ({
              playerId: e.playerId,
              type: e.type,
              minute: e.minute,
            }))}
          />
        </section>
      )}

      {match.status !== 'CANCELLED' && (
        <section className="card">
          <h2>Walkover</h2>
          {match.walkover && (
            <p className="alert warning">This result was awarded as a walkover.</p>
          )}
          <WalkoverForm
            matchId={match.id}
            homeName={match.homeTeam.name}
            awayName={match.awayTeam.name}
          />
        </section>
      )}
    </>
  );
}
