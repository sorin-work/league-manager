import Link from 'next/link';
import { NewSeasonForm } from '@/components/admin/NewSeasonForm';
import { formatDateRange, plural } from '@/lib/format';
import { listSeasonsWithDivisions } from '@/lib/server/services/seasons';

export default async function AdminSeasonsPage() {
  const seasons = await listSeasonsWithDivisions({ includeDrafts: true });

  return (
    <>
      <h1>Seasons</h1>
      <div className="two-col">
        <section className="card">
          {seasons.length === 0 ? (
            <p className="muted">No seasons yet. Create the first one.</p>
          ) : (
            <table>
              <thead>
                <tr>
                  <th>Season</th>
                  <th>Dates</th>
                  <th className="num">Divisions</th>
                </tr>
              </thead>
              <tbody>
                {seasons.map((s) => (
                  <tr key={s.id}>
                    <td>
                      <Link href={`/admin/seasons/${s.id}`}>{s.name}</Link>{' '}
                      {s.status !== 'ACTIVE' && (
                        <span className={s.status === 'DRAFT' ? 'badge warn' : 'badge'}>
                          {s.status === 'DRAFT' ? 'Draft' : 'Finished'}
                        </span>
                      )}
                    </td>
                    <td className="muted small">{formatDateRange(s.startDate, s.endDate)}</td>
                    <td className="num">{plural(s.divisions.length, 'division')}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </section>
        <section className="card">
          <h2>New season</h2>
          <NewSeasonForm />
        </section>
      </div>
    </>
  );
}
