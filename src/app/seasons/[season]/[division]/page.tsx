import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { MatchList } from '@/components/MatchList';
import { ScorersTable } from '@/components/ScorersTable';
import { StandingsTable } from '@/components/StandingsTable';
import { SuspensionsTable } from '@/components/SuspensionsTable';
import { Tabs } from '@/components/Tabs';
import { activeSuspensions } from '@/lib/domain/discipline';
import { TIEBREAKER_LABELS, type Tiebreaker } from '@/lib/domain/standings';
import { prisma } from '@/lib/server/db';
import { listAdjustments } from '@/lib/server/services/adjustments';
import { getDivisionSuspensions } from '@/lib/server/services/discipline';
import { getDivisionBySlugs } from '@/lib/server/services/divisions';
import { listDivisionMatches } from '@/lib/server/services/matches';
import { getDivisionScorers } from '@/lib/server/services/scorers';
import { getDivisionStandings } from '@/lib/server/services/standings';

type Props = {
  params: Promise<{ season: string; division: string }>;
  searchParams: Promise<{ tab?: string }>;
};

const TABS = [
  { id: 'table', label: 'Table' },
  { id: 'fixtures', label: 'Fixtures' },
  { id: 'results', label: 'Results' },
  { id: 'scorers', label: 'Top scorers' },
  { id: 'suspensions', label: 'Suspensions' },
];

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const p = await params;
  const division = await getDivisionBySlugs(p.season, p.division);
  return { title: division ? `${division.name} · ${division.season.name}` : 'Division not found' };
}

export default async function DivisionPage({ params, searchParams }: Props) {
  const p = await params;
  const { tab: tabParam } = await searchParams;
  const tab = TABS.some((t) => t.id === tabParam) ? tabParam! : 'table';
  const division = await getDivisionBySlugs(p.season, p.division);
  if (!division) notFound();
  const { season } = division;

  const [{ standings, rules }, teams, matches, scorers, suspensions, adjustments] =
    await Promise.all([
      getDivisionStandings(division.id),
      prisma.team.findMany({
        where: { divisionId: division.id },
        select: { id: true, slug: true, name: true },
      }),
      tab === 'fixtures' || tab === 'results'
        ? listDivisionMatches(division.id)
        : Promise.resolve([]),
      tab === 'scorers' ? getDivisionScorers(division.id) : Promise.resolve([]),
      tab === 'suspensions' ? getDivisionSuspensions(division.id) : Promise.resolve([]),
      tab === 'table' ? listAdjustments(division.id) : Promise.resolve([]),
    ]);
  const slugOf = new Map(teams.map((t) => [t.id, t.slug]));
  const base = `/seasons/${season.slug}/${division.slug}`;

  // with an odd number of teams somebody sits out every round
  const byes: Record<number, string> = {};
  if (teams.length % 2 === 1) {
    const rounds = new Map<number, Set<string>>();
    for (const m of matches) {
      const playing = rounds.get(m.round) ?? new Set<string>();
      playing.add(m.homeTeamId).add(m.awayTeamId);
      rounds.set(m.round, playing);
    }
    for (const [round, playing] of rounds) {
      const resting = teams.find((t) => !playing.has(t.id));
      if (resting) byes[round] = resting.name;
    }
  }

  return (
    <div className="container">
      <div className="breadcrumbs">
        <Link href="/">Seasons</Link> / <Link href={`/seasons/${season.slug}`}>{season.name}</Link>
      </div>
      <h1>{division.name}</h1>
      <Tabs tabs={TABS} active={tab} href={(id) => (id === 'table' ? base : `${base}?tab=${id}`)} />

      {tab === 'fixtures' && (
        <section className="card">
          <MatchList
            matches={matches.filter((m) => m.status !== 'PLAYED')}
            timeZone={season.timezone}
            byes={byes}
            emptyText="No fixtures left to play."
          />
        </section>
      )}

      {tab === 'results' && (
        <section className="card">
          <MatchList
            matches={matches.filter((m) => m.status === 'PLAYED')}
            timeZone={season.timezone}
            newestFirst
            emptyText="No results yet."
          />
        </section>
      )}

      {tab === 'suspensions' && (
        <section className="card">
          <SuspensionsTable
            rows={activeSuspensions(suspensions)}
            yellowLimit={season.yellowCardLimit}
          />
        </section>
      )}

      {tab === 'scorers' && (
        <section className="card">
          <ScorersTable rows={scorers} />
        </section>
      )}

      {tab === 'table' && (
        <section className="card">
          <StandingsTable
            rows={standings}
            teamHref={(id) => `${base}/teams/${slugOf.get(id)}`}
            promotionPlaces={division.promotionPlaces}
            relegationPlaces={division.relegationPlaces}
          />
          {(division.promotionPlaces > 0 || division.relegationPlaces > 0) && (
            <p className="legend small">
              {division.promotionPlaces > 0 && <span className="key zone-up">Promotion</span>}
              {division.relegationPlaces > 0 && <span className="key zone-down">Relegation</span>}
            </p>
          )}
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
          {adjustments.length > 0 && (
            <ul className="muted small adjustments">
              {adjustments.map((a) => (
                <li key={a.id}>
                  * {a.team.name}: {a.points > 0 ? `+${a.points}` : a.points}{' '}
                  {Math.abs(a.points) === 1 ? 'point' : 'points'} ({a.reason})
                </li>
              ))}
            </ul>
          )}
        </section>
      )}
    </div>
  );
}
