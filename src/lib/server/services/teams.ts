import { uniqueSlug } from '@/lib/domain/slug';
import type { TeamInput, TeamUpdate } from '@/lib/validation';
import { prisma } from '../db';
import { badRequest, conflict, notFound } from '../http';
import { getDivision } from './divisions';

export async function listTeams(divisionId: string) {
  await getDivision(divisionId);
  return prisma.team.findMany({
    where: { divisionId },
    orderBy: { name: 'asc' },
    include: { homeVenue: true, _count: { select: { players: true } } },
  });
}

export async function getTeam(id: string) {
  const team = await prisma.team.findUnique({
    where: { id },
    include: {
      homeVenue: true,
      division: { include: { season: true } },
      players: { orderBy: [{ shirtNumber: 'asc' }, { name: 'asc' }] },
    },
  });
  if (!team) throw notFound('Team not found');
  return team;
}

export async function getTeamBySlugs(seasonSlug: string, divisionSlug: string, teamSlug: string) {
  return prisma.team.findFirst({
    where: {
      slug: teamSlug,
      division: { slug: divisionSlug, season: { slug: seasonSlug, status: { not: 'DRAFT' } } },
    },
    include: {
      homeVenue: true,
      division: { include: { season: true } },
      players: { orderBy: [{ shirtNumber: 'asc' }, { name: 'asc' }] },
    },
  });
}

async function takenSlugs(divisionId: string, excludeId?: string) {
  const rows = await prisma.team.findMany({
    where: { divisionId, id: excludeId ? { not: excludeId } : undefined },
    select: { slug: true },
  });
  return rows.map((r) => r.slug);
}

async function checkVenue(venueId: string | null | undefined) {
  if (!venueId) return;
  const venue = await prisma.venue.findUnique({ where: { id: venueId } });
  if (!venue) throw badRequest('Unknown venue');
}

export async function createTeam(divisionId: string, input: TeamInput) {
  await getDivision(divisionId);
  await checkVenue(input.homeVenueId);
  return prisma.team.create({
    data: { ...input, divisionId, slug: uniqueSlug(input.name, await takenSlugs(divisionId)) },
  });
}

export async function updateTeam(id: string, input: TeamUpdate) {
  const current = await getTeam(id);
  await checkVenue(input.homeVenueId);
  const slug =
    input.name && input.name !== current.name
      ? uniqueSlug(input.name, await takenSlugs(current.divisionId, id))
      : undefined;
  return prisma.team.update({ where: { id }, data: { ...input, slug } });
}

/**
 * Copies the teams of one division (usually last season's) into another.
 * Teams whose slug already exists in the target are skipped.
 */
export async function copyTeams(targetId: string, sourceId: string, includePlayers: boolean) {
  if (targetId === sourceId) throw badRequest('Pick a different division to copy from');
  await getDivision(targetId);
  await getDivision(sourceId);
  const [source, existing] = await Promise.all([
    prisma.team.findMany({ where: { divisionId: sourceId }, include: { players: true } }),
    takenSlugs(targetId),
  ]);
  const taken = new Set(existing);
  const toCopy = source.filter((t) => !taken.has(t.slug));

  await prisma.$transaction(
    toCopy.map((t) =>
      prisma.team.create({
        data: {
          divisionId: targetId,
          name: t.name,
          shortName: t.shortName,
          slug: t.slug,
          homeVenueId: t.homeVenueId,
          players: includePlayers
            ? { create: t.players.map((p) => ({ name: p.name, shirtNumber: p.shirtNumber })) }
            : undefined,
        },
      }),
    ),
  );
  return { copied: toCopy.length, skipped: source.length - toCopy.length };
}

export async function deleteTeam(id: string) {
  await getTeam(id);
  const fixtures = await prisma.match.count({
    where: { OR: [{ homeTeamId: id }, { awayTeamId: id }] },
  });
  if (fixtures > 0) throw conflict('This team already has fixtures. Clear the fixtures first.');
  await prisma.team.delete({ where: { id } });
}
