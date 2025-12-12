import Link from 'next/link';
import { notFound } from 'next/navigation';
import { DeleteButton } from '@/components/admin/DeleteButton';
import { NewTeamForm } from '@/components/admin/NewTeamForm';
import { plural } from '@/lib/format';
import { getDivision } from '@/lib/server/services/divisions';
import { listTeams } from '@/lib/server/services/teams';
import { listVenues } from '@/lib/server/services/venues';

type Props = { params: Promise<{ id: string }> };

export default async function AdminDivisionPage({ params }: Props) {
  const division = await getDivision((await params).id).catch(() => null);
  if (!division) notFound();
  const [teams, venues] = await Promise.all([listTeams(division.id), listVenues()]);

  return (
    <>
      <div className="breadcrumbs">
        <Link href="/admin/seasons">Seasons</Link> /{' '}
        <Link href={`/admin/seasons/${division.seasonId}`}>{division.season.name}</Link>
      </div>
      <h1>{division.name}</h1>

      <section className="card">
        <h2>Teams</h2>
        {teams.length === 0 ? (
          <p className="muted">No teams yet. Add at least two to make fixtures.</p>
        ) : (
          <table>
            <tbody>
              {teams.map((t) => (
                <tr key={t.id}>
                  <td>
                    <Link href={`/admin/teams/${t.id}`}>{t.name}</Link>{' '}
                    {t.shortName && <span className="muted small">{t.shortName}</span>}
                  </td>
                  <td className="muted small">{t.homeVenue?.name ?? ''}</td>
                  <td className="num">{plural(t._count.players, 'player')}</td>
                  <td className="num">
                    <DeleteButton url={`/api/teams/${t.id}`} confirm={`Remove ${t.name}?`} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
        <h3>Add a team</h3>
        <NewTeamForm divisionId={division.id} venues={venues} />
      </section>
    </>
  );
}
