import { computeStandings } from '@/lib/domain/standings';
import { prisma } from '../db';
import { getDivision } from './divisions';
import { standingsRules } from './rules';

export async function getDivisionStandings(divisionId: string) {
  const division = await getDivision(divisionId);
  const { season } = division;
  const rules = standingsRules(season);

  const [teams, matches, adjustments] = await Promise.all([
    prisma.team.findMany({ where: { divisionId }, select: { id: true, name: true } }),
    prisma.match.findMany({
      where: {
        divisionId,
        status: 'PLAYED',
        homeScore: { not: null },
        awayScore: { not: null },
      },
      select: {
        homeTeamId: true,
        awayTeamId: true,
        homeScore: true,
        awayScore: true,
        kickoffAt: true,
      },
    }),
    prisma.pointsAdjustment.findMany({
      where: { divisionId },
      select: { teamId: true, points: true },
    }),
  ]);

  const results = matches.map((m) => ({
    homeTeamId: m.homeTeamId,
    awayTeamId: m.awayTeamId,
    homeScore: m.homeScore!,
    awayScore: m.awayScore!,
    playedAt: m.kickoffAt,
  }));

  return { rules, standings: computeStandings(teams, results, rules, adjustments) };
}
