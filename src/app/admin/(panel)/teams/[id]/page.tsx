import Link from 'next/link';
import { notFound } from 'next/navigation';
import { Roster } from '@/components/admin/Roster';
import { TeamForm } from '@/components/admin/TeamForm';
import { getTeam } from '@/lib/server/services/teams';
import { listVenues } from '@/lib/server/services/venues';

type Props = { params: Promise<{ id: string }> };

export default async function AdminTeamPage({ params }: Props) {
  const team = await getTeam((await params).id).catch(() => null);
  if (!team) notFound();
  const venues = await listVenues();
  const { division } = team;

  return (
    <>
      <div className="breadcrumbs">
        <Link href={`/admin/seasons/${division.seasonId}`}>{division.season.name}</Link> /{' '}
        <Link href={`/admin/divisions/${division.id}`}>{division.name}</Link>
      </div>
      <h1>{team.name}</h1>
      <div className="two-col">
        <section className="card">
          <h2>Squad</h2>
          <Roster
            teamId={team.id}
            players={team.players.map((p) => ({
              id: p.id,
              name: p.name,
              shirtNumber: p.shirtNumber,
            }))}
          />
        </section>
        <section className="card">
          <h2>Details</h2>
          <TeamForm team={team} venues={venues} />
        </section>
      </div>
    </>
  );
}
