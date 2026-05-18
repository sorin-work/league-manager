import type { Prisma } from '@prisma/client';
import { offset, pageCount, type Page } from '@/lib/domain/pagination';
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

/** Next scheduled matches across all public seasons. */
export function listUpcomingMatches(limit = 8, now = new Date()) {
  return prisma.match.findMany({
    where: {
      status: 'SCHEDULED',
      kickoffAt: { gte: now },
      division: { season: { status: { not: 'DRAFT' } } },
    },
    include: { ...matchInclude, division: { include: { season: true } } },
    orderBy: { kickoffAt: 'asc' },
    take: limit,
  });
}

/** Played matches of a division, most recent first, one page at a time. */
export async function listDivisionResults(divisionId: string, requested: Page) {
  await getDivision(divisionId);
  const where = { divisionId, status: 'PLAYED' as const };
  const total = await prisma.match.count({ where });
  const totalPages = pageCount(total, requested.pageSize);
  const page = Math.min(requested.page, totalPages);
  const results = await prisma.match.findMany({
    where,
    include: matchInclude,
    orderBy: [{ kickoffAt: 'desc' }, { round: 'desc' }, { id: 'asc' }],
    skip: offset({ page, pageSize: requested.pageSize }),
    take: requested.pageSize,
  });
  return { results, page, pageSize: requested.pageSize, total, totalPages };
}

export function listTeamMatches(teamId: string) {
  return prisma.match.findMany({
    where: { OR: [{ homeTeamId: teamId }, { awayTeamId: teamId }] },
    include: matchInclude,
    orderBy: [{ round: 'asc' }, { kickoffAt: 'asc' }],
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

/** A match with its events and everything a match page needs, or null. */
export function getMatchDetails(id: string) {
  return prisma.match.findUnique({
    where: { id },
    include: {
      ...matchInclude,
      division: { include: { season: true } },
      events: {
        include: { player: { select: { id: true, name: true, shirtNumber: true } } },
        orderBy: [{ minute: 'asc' }, { createdAt: 'asc' }],
      },
    },
  });
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
    data: {
      kickoffAt,
      venueId: input.venueId,
      status: input.status,
      referee: input.referee,
      notes: input.notes,
    },
    include: matchInclude,
  });
}
