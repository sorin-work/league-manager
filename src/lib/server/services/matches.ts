import type { Prisma } from '@prisma/client';
import { prisma } from '../db';
import { notFound } from '../http';
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
