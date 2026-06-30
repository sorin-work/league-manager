import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { formatDateRange, plural } from '@/lib/format';
import { notesToHtml } from '@/lib/notes';
import { listDivisions } from '@/lib/server/services/divisions';
import { loadSeason } from '@/lib/server/page-data';

type Props = { params: Promise<{ season: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const season = await loadSeason((await params).season);
  return { title: season?.name ?? 'Season not found' };
}

export default async function SeasonPage({ params }: Props) {
  const season = await loadSeason((await params).season);
  if (!season) notFound();
  const divisions = await listDivisions(season.id);

  return (
    <div className="container">
      <div className="breadcrumbs">
        <Link href="/">Seasons</Link>
      </div>
      <h1>
        {season.name} {season.status === 'FINISHED' && <span className="badge">Finished</span>}
      </h1>
      <p className="muted">{formatDateRange(season.startDate, season.endDate)}</p>
      {season.notes && (
        <section
          className="card notes"
          dangerouslySetInnerHTML={{ __html: notesToHtml(season.notes) }}
        />
      )}

      {divisions.length === 0 ? (
        <div className="card empty">No divisions have been set up for this season yet.</div>
      ) : (
        <div className="grid">
          {divisions.map((d) => (
            <Link key={d.id} href={`/seasons/${season.slug}/${d.slug}`} className="card">
              <h2>{d.name}</h2>
              <p className="muted small">
                {plural(d._count.teams, 'team')} ·{' '}
                {d.format === 'DOUBLE' ? 'home and away' : 'single round-robin'}
              </p>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
