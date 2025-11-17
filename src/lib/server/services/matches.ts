import type { Prisma } from '@prisma/client';
import { zonedTimeToUtc } from '@/lib/domain/time';
import type { MatchUpdate } from '@/lib/validation';
import { prisma } from '../db';
import { badRequest, notFound } from '../http';
import { getDivision } from './divisions';

const teamSummary = { select: { id: true, name: true, shortName: true, slug: true } } as const;

export const matchInclude = {
  homeTeam: teamSummary,
  awayTeam: teamSummary,
  venue: { select: { id: true, name: true } },
} satisfies Prisma.MatchInclude;

export type MatchWithTeams = Prisma.MatchGetPayload<{ include: typeof matchInclude }>;

export async function listDivisionMatches(divisionId: string, filter: { round?: number } = {}) {
  await getDivision(divisionId);
  return prisma.match.findMany({
    where: { divisionId, round: filter.round },
    include: matchInclude,
    orderBy: [{ round: 'asc' }, { kickoffAt: 'asc' }, { id: 'asc' }],
  });
}

export async function getMatch(id: string) {
  const match = await prisma.match.findUnique({
    where: { id },
    include: { ...matchInclude, division: { include: { season: true } } },
  });
  if (!match) throw notFound('Match not found');
  return match;
}

/** Moves a match, changes its venue or postpones/cancels it. */
export async function updateMatchSchedule(id: string, input: MatchUpdate) {
  const match = await getMatch(id);
  if (input.venueId) {
    const venue = await prisma.venue.findUnique({ where: { id: input.venueId } });
    if (!venue) throw badRequest('Unknown venue');
  }
  const kickoffAt =
    input.kickoffAt === undefined
      ? undefined
      : input.kickoffAt === null
        ? null
        : zonedTimeToUtc(input.kickoffAt, match.division.season.timezone);

  return prisma.match.update({
    where: { id },
    data: { kickoffAt, venueId: input.venueId, status: input.status },
    include: matchInclude,
  });
}
