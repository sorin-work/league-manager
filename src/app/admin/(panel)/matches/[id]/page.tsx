import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ScheduleForm } from '@/components/admin/ScheduleForm';
import { formatKickoff, toLocalInput } from '@/lib/domain/time';
import { getMatchDetails } from '@/lib/server/services/matches';
import { listVenues } from '@/lib/server/services/venues';

type Props = { params: Promise<{ id: string }> };

export default async function AdminMatchPage({ params }: Props) {
  const match = await getMatchDetails((await params).id);
  if (!match) notFound();
  const venues = await listVenues();
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
          timeZone={tz}
          venues={venues}
        />
      </section>
    </>
  );
}
