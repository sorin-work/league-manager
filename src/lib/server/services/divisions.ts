import { uniqueSlug } from '@/lib/domain/slug';
import type { DivisionInput, DivisionUpdate } from '@/lib/validation';
import { prisma } from '../db';
import { notFound } from '../http';
import { getSeason } from './seasons';

export async function listDivisions(seasonId: string) {
  await getSeason(seasonId);
  return prisma.division.findMany({
    where: { seasonId },
    orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }],
    include: { _count: { select: { teams: true } } },
  });
}

export async function getDivision(id: string) {
  const division = await prisma.division.findUnique({ where: { id }, include: { season: true } });
  if (!division) throw notFound('Division not found');
  return division;
}

export async function getDivisionBySlugs(seasonSlug: string, divisionSlug: string) {
  return prisma.division.findFirst({
    where: { slug: divisionSlug, season: { slug: seasonSlug, status: { not: 'DRAFT' } } },
    include: { season: true },
  });
}

async function takenSlugs(seasonId: string, excludeId?: string) {
  const rows = await prisma.division.findMany({
    where: { seasonId, id: excludeId ? { not: excludeId } : undefined },
    select: { slug: true },
  });
  return rows.map((r) => r.slug);
}

export async function createDivision(seasonId: string, input: DivisionInput) {
  await getSeason(seasonId);
  return prisma.division.create({
    data: { ...input, seasonId, slug: uniqueSlug(input.name, await takenSlugs(seasonId)) },
  });
}

export async function updateDivision(id: string, input: DivisionUpdate) {
  const current = await getDivision(id);
  const slug =
    input.name && input.name !== current.name
      ? uniqueSlug(input.name, await takenSlugs(current.seasonId, id))
      : undefined;
  return prisma.division.update({ where: { id }, data: { ...input, slug } });
}

export async function deleteDivision(id: string) {
  await getDivision(id);
  await prisma.division.delete({ where: { id } });
}
