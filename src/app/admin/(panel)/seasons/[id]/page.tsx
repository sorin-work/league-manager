import Link from 'next/link';
import { notFound } from 'next/navigation';
import { DeleteButton } from '@/components/admin/DeleteButton';
import { NewDivisionForm } from '@/components/admin/NewDivisionForm';
import { SeasonSettingsForm } from '@/components/admin/SeasonSettingsForm';
import { plural } from '@/lib/format';
import { listDivisions } from '@/lib/server/services/divisions';
import { getSeason } from '@/lib/server/services/seasons';

type Props = { params: Promise<{ id: string }> };

export default async function AdminSeasonPage({ params }: Props) {
  const season = await getSeason((await params).id).catch(() => null);
  if (!season) notFound();
  const divisions = await listDivisions(season.id);

  return (
    <>
      <div className="breadcrumbs">
        <Link href="/admin/seasons">Seasons</Link>
      </div>
      <h1>{season.name}</h1>
      <p>
        <Link href={`/seasons/${season.slug}`}>View public page</Link>
      </p>
      <section className="card">
        <h2>Divisions</h2>
        {divisions.length === 0 ? (
          <p className="muted">No divisions yet.</p>
        ) : (
          <table>
            <tbody>
              {divisions.map((d) => (
                <tr key={d.id}>
                  <td>
                    <Link href={`/admin/divisions/${d.id}`}>{d.name}</Link>
                  </td>
                  <td className="muted small">
                    {d.format === 'DOUBLE' ? 'Home and away' : 'Single round-robin'}
                  </td>
                  <td className="num">{plural(d._count.teams, 'team')}</td>
                  <td className="num">
                    <DeleteButton
                      url={`/api/divisions/${d.id}`}
                      confirm={`Delete ${d.name} with all its teams, fixtures and results?`}
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
        <h3>Add a division</h3>
        <NewDivisionForm seasonId={season.id} />
      </section>

      <section className="card">
        <h2>Settings</h2>
        <SeasonSettingsForm season={season} />
      </section>
    </>
  );
}
