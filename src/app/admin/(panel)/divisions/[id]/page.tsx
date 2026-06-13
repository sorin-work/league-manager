import Link from 'next/link';
import { notFound } from 'next/navigation';
import { AdjustmentsPanel } from '@/components/admin/AdjustmentsPanel';
import { AdminMatchTable } from '@/components/admin/AdminMatchTable';
import { CopyTeamsForm } from '@/components/admin/CopyTeamsForm';
import { DeleteButton } from '@/components/admin/DeleteButton';
import { DivisionSettingsForm } from '@/components/admin/DivisionSettingsForm';
import { GenerateFixturesForm } from '@/components/admin/GenerateFixturesForm';
import { NewTeamForm } from '@/components/admin/NewTeamForm';
import { RoundScoresForm } from '@/components/admin/RoundScoresForm';
import { plural } from '@/lib/format';
import { prisma } from '@/lib/server/db';
import { listAdjustments } from '@/lib/server/services/adjustments';
import { getDivision } from '@/lib/server/services/divisions';
import { listDivisionMatches } from '@/lib/server/services/matches';
import { listTeams } from '@/lib/server/services/teams';
import { listVenues } from '@/lib/server/services/venues';

type Props = {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ round?: string }>;
};

export default async function AdminDivisionPage({ params, searchParams }: Props) {
  const { round: roundParam } = await searchParams;
  const division = await getDivision((await params).id).catch(() => null);
  if (!division) notFound();
  const [teams, venues, matches, adjustments, otherDivisions] = await Promise.all([
    listTeams(division.id),
    listVenues(),
    listDivisionMatches(division.id),
    listAdjustments(division.id),
    prisma.division.findMany({
      where: { id: { not: division.id } },
      include: { season: { select: { name: true, startDate: true } } },
      orderBy: [{ season: { startDate: 'desc' } }, { sortOrder: 'asc' }],
    }),
  ]);
  const seasonStart = division.season.startDate.toISOString().slice(0, 10);
  const rounds = [...new Set(matches.map((m) => m.round))].sort((a, b) => a - b);
  const round = rounds.includes(Number(roundParam)) ? Number(roundParam) : null;
  const shown = round === null ? matches : matches.filter((m) => m.round === round);
  const withEvents = await prisma.matchEvent.groupBy({
    by: ['matchId'],
    where: { matchId: { in: shown.map((m) => m.id) } },
  });
  const eventCounts = new Set(withEvents.map((e) => e.matchId));

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
        {otherDivisions.length > 0 && (
          <>
            <h3>Copy from another division</h3>
            <CopyTeamsForm
              divisionId={division.id}
              sources={otherDivisions.map((d) => ({
                id: d.id,
                label: `${d.season.name} – ${d.name}`,
              }))}
            />
          </>
        )}
      </section>

      <section className="card">
        <h2>Settings</h2>
        <DivisionSettingsForm division={division} />
      </section>

      <section className="card">
        <h2>Points adjustments</h2>
        <AdjustmentsPanel
          divisionId={division.id}
          teams={teams.map((t) => ({ id: t.id, name: t.name }))}
          adjustments={adjustments}
        />
      </section>

      <section className="card">
        <h2>Fixtures</h2>
        {matches.length === 0 ? (
          teams.length < 2 ? (
            <p className="muted">Add at least two teams before generating fixtures.</p>
          ) : (
            <GenerateFixturesForm
              divisionId={division.id}
              format={division.format}
              defaultStart={seasonStart}
              venues={venues}
            />
          )
        ) : (
          <>
            <nav className="round-filter small">
              <Link
                href={`/admin/divisions/${division.id}`}
                className={round === null ? 'active' : undefined}
              >
                All rounds
              </Link>
              {rounds.map((r) => (
                <Link
                  key={r}
                  href={`/admin/divisions/${division.id}?round=${r}`}
                  className={r === round ? 'active' : undefined}
                >
                  {r}
                </Link>
              ))}
            </nav>
            <AdminMatchTable matches={shown} timeZone={division.season.timezone} />
            {round !== null && (
              <>
                <h3>Scores for round {round}</h3>
                <RoundScoresForm
                  divisionId={division.id}
                  round={round}
                  matches={shown.map((m) => ({
                    id: m.id,
                    home: m.homeTeam.name,
                    away: m.awayTeam.name,
                    homeScore: m.homeScore,
                    awayScore: m.awayScore,
                    hasEvents: eventCounts.has(m.id),
                  }))}
                />
              </>
            )}
            <p>
              <DeleteButton
                url={`/api/divisions/${division.id}/fixtures`}
                label="Clear fixtures"
                confirm="Delete all fixtures of this division? This only works before any result is entered."
              />
            </p>
          </>
        )}
      </section>
    </>
  );
}
