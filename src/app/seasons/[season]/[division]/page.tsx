import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { StandingsTable } from '@/components/StandingsTable';
import { TIEBREAKER_LABELS, type Tiebreaker } from '@/lib/domain/standings';
import { prisma } from '@/lib/server/db';
import { getDivisionBySlugs } from '@/lib/server/services/divisions';
import { getDivisionStandings } from '@/lib/server/services/standings';

type Props = { params: Promise<{ season: string; division: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const p = await params;
  const division = await getDivisionBySlugs(p.season, p.division);
  return { title: division ? `${division.name} · ${division.season.name}` : 'Division not found' };
}

export default async function DivisionPage({ params }: Props) {
  const p = await params;
  const division = await getDivisionBySlugs(p.season, p.division);
  if (!division) notFound();
  const { season } = division;

  const [{ standings, rules }, teams] = await Promise.all([
    getDivisionStandings(division.id),
    prisma.team.findMany({ where: { divisionId: division.id }, select: { id: true, slug: true } }),
  ]);
  const slugOf = new Map(teams.map((t) => [t.id, t.slug]));
  const base = `/seasons/${season.slug}/${division.slug}`;

  return (
    <div className="container">
      <div className="breadcrumbs">
        <Link href="/">Seasons</Link> / <Link href={`/seasons/${season.slug}`}>{season.name}</Link>
      </div>
      <h1>{division.name}</h1>

      <section className="card">
        <h2>Table</h2>
        <StandingsTable rows={standings} teamHref={(id) => `${base}/teams/${slugOf.get(id)}`} />
        <p className="muted small">
          {rules.pointsForWin} points for a win, {rules.pointsForDraw} for a draw
          {rules.pointsForLoss > 0 ? `, ${rules.pointsForLoss} for a loss` : ''}. Teams level on
          points are separated by{' '}
          {rules.tiebreakers.length > 0
            ? rules.tiebreakers
                .map((t: Tiebreaker) => TIEBREAKER_LABELS[t].toLowerCase())
                .join(', ')
            : 'name'}
          .
        </p>
      </section>
    </div>
  );
}
