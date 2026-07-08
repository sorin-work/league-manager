import { SCORING_TYPES } from '@/lib/domain/events';
import { topScorers } from '@/lib/domain/scorers';
import { prisma } from '../db';
import { getDivision } from './divisions';

export async function getDivisionScorers(divisionId: string, limit = 20) {
  await getDivision(divisionId);
  const events = await prisma.matchEvent.findMany({
    where: { match: { divisionId, status: 'PLAYED' }, type: { in: [...SCORING_TYPES] } },
    select: {
      type: true,
      playerId: true,
      player: { select: { name: true, teamId: true, team: { select: { name: true } } } },
    },
  });
  return topScorers(
    events.map((e) => ({
      type: e.type,
      playerId: e.playerId,
      playerName: e.player.name,
      teamId: e.player.teamId,
      teamName: e.player.team.name,
    })),
    limit,
  );
}
