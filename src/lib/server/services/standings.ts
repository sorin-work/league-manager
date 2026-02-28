import { computeStandings, type StandingsRules, type Tiebreaker } from '@/lib/domain/standings';
import { prisma } from '../db';
import { getDivision } from './divisions';

export async function getDivisionStandings(divisionId: string) {
  const division = await getDivision(divisionId);
  const { season } = division;
  const rules: StandingsRules = {
    pointsForWin: season.pointsForWin,
    pointsForDraw: season.pointsForDraw,
    pointsForLoss: season.pointsForLoss,
    tiebreakers: season.tiebreakers as Tiebreaker[],
  };

  const [teams, matches, adjustments] = await Promise.all([
    prisma.team.findMany({ where: { divisionId }, select: { id: true, name: true } }),
    prisma.match.findMany({
      where: { divisionId, homeScore: { not: null }, awayScore: { not: null } },
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
