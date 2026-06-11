import { computeSuspensions, type TeamFixture } from '@/lib/domain/discipline';
import { prisma } from '../db';
import { getDivision } from './divisions';
import { disciplineRules } from './rules';

export async function getDivisionSuspensions(divisionId: string) {
  const { season } = await getDivision(divisionId);
  const matches = await prisma.match.findMany({
    where: { divisionId, status: { not: 'CANCELLED' } },
    select: {
      id: true,
      round: true,
      kickoffAt: true,
      status: true,
      homeTeamId: true,
      awayTeamId: true,
    },
  });

  const fixtures: TeamFixture[] = matches.flatMap((m) => {
    const order = m.kickoffAt ? m.kickoffAt.getTime() : Number.MAX_SAFE_INTEGER - 1000 + m.round;
    const played = m.status === 'PLAYED';
    return [
      { matchId: m.id, teamId: m.homeTeamId, order, played },
      { matchId: m.id, teamId: m.awayTeamId, order, played },
    ];
  });

  const events = await prisma.matchEvent.findMany({
    where: { match: { divisionId }, type: { in: ['YELLOW_CARD', 'RED_CARD'] } },
    select: { matchId: true, playerId: true, teamId: true, type: true },
  });
  const cards = events.map((e) => ({ ...e, type: e.type as 'YELLOW_CARD' | 'RED_CARD' }));

  const suspensions = computeSuspensions(fixtures, cards, disciplineRules(season));

  const players = await prisma.player.findMany({
    where: { id: { in: suspensions.map((s) => s.playerId) } },
    select: { id: true, name: true, team: { select: { id: true, name: true } } },
  });
  const byId = new Map(players.map((p) => [p.id, p]));

  return suspensions.map((s) => ({
    ...s,
    playerName: byId.get(s.playerId)?.name ?? 'Unknown player',
    teamName: byId.get(s.playerId)?.team.name ?? '',
  }));
}
