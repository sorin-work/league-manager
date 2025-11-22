import { topScorers } from '@/lib/domain/scorers';
import { prisma } from '../db';
import { getDivision } from './divisions';

export async function getDivisionScorers(divisionId: string, limit = 20) {
  await getDivision(divisionId);
  const events = await prisma.matchEvent.findMany({
    where: { match: { divisionId, status: 'PLAYED' } },
    include: { player: { include: { team: true } } },
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
