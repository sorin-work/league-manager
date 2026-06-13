import type { ResultInput, WalkoverInput } from '@/lib/validation';
import { prisma } from '../db';
import { badRequest, conflict } from '../http';
import { getMatch, matchInclude } from './matches';

const SCORING = new Set(['GOAL', 'PENALTY_GOAL']);

/**
 * Saves the final score and replaces the match events. Goals with a known
 * scorer may not add up to more than the score; unknown scorers are fine.
 */
export async function saveResult(matchId: string, input: ResultInput) {
  const match = await getMatch(matchId);
  if (match.status === 'CANCELLED') throw conflict('This match was cancelled');

  const playerIds = [...new Set(input.events.map((e) => e.playerId))];
  const players = await prisma.player.findMany({ where: { id: { in: playerIds } } });
  if (players.length !== playerIds.length) throw badRequest('Unknown player in match events');
  const outsider = players.find(
    (p) => p.teamId !== match.homeTeamId && p.teamId !== match.awayTeamId,
  );
  if (outsider) throw badRequest(`${outsider.name} does not play for either team`);
  const teamOf = new Map(players.map((p) => [p.id, p.teamId]));

  let homeGoals = 0;
  let awayGoals = 0;
  for (const e of input.events) {
    const team = teamOf.get(e.playerId);
    if (SCORING.has(e.type)) {
      if (team === match.homeTeamId) homeGoals++;
      if (team === match.awayTeamId) awayGoals++;
    } else if (e.type === 'OWN_GOAL') {
      if (team === match.homeTeamId) awayGoals++;
      if (team === match.awayTeamId) homeGoals++;
    }
  }
  if (homeGoals > input.homeScore) throw badRequest('More home goals listed than the score');
  if (awayGoals > input.awayScore) throw badRequest('More away goals listed than the score');

  return prisma.$transaction(async (tx) => {
    await tx.matchEvent.deleteMany({ where: { matchId } });
    await tx.matchEvent.createMany({
      data: input.events.map((e) => ({
        matchId,
        playerId: e.playerId,
        teamId: teamOf.get(e.playerId)!,
        type: e.type,
        minute: e.minute ?? null,
      })),
    });
    return tx.match.update({
      where: { id: matchId },
      data: {
        status: 'PLAYED',
        homeScore: input.homeScore,
        awayScore: input.awayScore,
        walkover: false,
      },
      include: { ...matchInclude, events: { orderBy: [{ minute: 'asc' }, { createdAt: 'asc' }] } },
    });
  });
}

/**
 * Quick entry of final scores for one round. Matches that already have scorers
 * or cards must be edited on their own page so the events stay consistent.
 */
export async function saveRoundScores(
  divisionId: string,
  round: number,
  scores: { matchId: string; homeScore: number; awayScore: number }[],
) {
  const ids = scores.map((s) => s.matchId);
  if (new Set(ids).size !== ids.length) throw badRequest('A match is listed twice');
  const matches = await prisma.match.findMany({
    where: { id: { in: ids } },
    include: { _count: { select: { events: true } } },
  });
  for (const id of ids) {
    const m = matches.find((x) => x.id === id);
    if (!m || m.divisionId !== divisionId || m.round !== round) {
      throw badRequest('A match is not part of this round');
    }
    if (m.status === 'CANCELLED') throw conflict('A cancelled match cannot get a score');
    if (m._count.events > 0) {
      throw conflict('A match with scorers or cards has to be edited on its own page');
    }
  }
  await prisma.$transaction(
    scores.map((s) =>
      prisma.match.update({
        where: { id: s.matchId },
        data: {
          status: 'PLAYED',
          walkover: false,
          homeScore: s.homeScore,
          awayScore: s.awayScore,
        },
      }),
    ),
  );
  return { saved: scores.length };
}

/** Awards the match to one side without it being played; any events are dropped. */
export async function awardWalkover(matchId: string, input: WalkoverInput) {
  const match = await getMatch(matchId);
  if (match.status === 'CANCELLED') throw conflict('This match was cancelled');
  const home = input.winner === 'HOME';
  return prisma.$transaction(async (tx) => {
    await tx.matchEvent.deleteMany({ where: { matchId } });
    return tx.match.update({
      where: { id: matchId },
      data: {
        status: 'PLAYED',
        walkover: true,
        homeScore: home ? input.goals : 0,
        awayScore: home ? 0 : input.goals,
      },
      include: matchInclude,
    });
  });
}

/** Takes a result back off, e.g. when it was entered for the wrong match. */
export async function clearResult(matchId: string) {
  await getMatch(matchId);
  return prisma.$transaction(async (tx) => {
    await tx.matchEvent.deleteMany({ where: { matchId } });
    return tx.match.update({
      where: { id: matchId },
      data: { status: 'SCHEDULED', homeScore: null, awayScore: null, walkover: false },
      include: matchInclude,
    });
  });
}
