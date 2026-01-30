import type { Season, SeasonStatus } from '@prisma/client';
import { uniqueSlug } from '@/lib/domain/slug';
import type { Tiebreaker } from '@/lib/domain/standings';
import type { SeasonInput, SeasonUpdate } from '@/lib/validation';
import { prisma } from '../db';
import { badRequest, notFound } from '../http';

export interface SeasonDto {
  id: string;
  name: string;
  slug: string;
  status: SeasonStatus;
  startDate: string;
  endDate: string;
  timezone: string;
  pointsForWin: number;
  pointsForDraw: number;
  pointsForLoss: number;
  tiebreakers: Tiebreaker[];
  yellowCardLimit: number;
  yellowCardBan: number;
  redCardBan: number;
  notes: string | null;
}

const toDate = (iso: string) => new Date(`${iso}T00:00:00Z`);
const fromDate = (d: Date) => d.toISOString().slice(0, 10);

export function toSeasonDto(s: Season): SeasonDto {
  return {
    id: s.id,
    name: s.name,
    slug: s.slug,
    status: s.status,
    startDate: fromDate(s.startDate),
    endDate: fromDate(s.endDate),
    timezone: s.timezone,
    pointsForWin: s.pointsForWin,
    pointsForDraw: s.pointsForDraw,
    pointsForLoss: s.pointsForLoss,
    tiebreakers: s.tiebreakers as Tiebreaker[],
    yellowCardLimit: s.yellowCardLimit,
    yellowCardBan: s.yellowCardBan,
    redCardBan: s.redCardBan,
    notes: s.notes,
  };
}

export interface Visibility {
  /** Admins also see draft seasons. */
  includeDrafts?: boolean;
}

const visible = ({ includeDrafts = false }: Visibility = {}) =>
  includeDrafts ? {} : { status: { not: 'DRAFT' as const } };

export async function listSeasons(options: Visibility = {}): Promise<SeasonDto[]> {
  const seasons = await prisma.season.findMany({
    where: visible(options),
    orderBy: { startDate: 'desc' },
  });
  return seasons.map(toSeasonDto);
}

/** Seasons with their divisions, for the public home page. */
export async function listSeasonsWithDivisions() {
  const seasons = await prisma.season.findMany({
    orderBy: { startDate: 'desc' },
    include: {
      divisions: {
        orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }],
        select: { id: true, name: true, slug: true, _count: { select: { teams: true } } },
      },
    },
  });
  return seasons.map((s) => ({ ...toSeasonDto(s), divisions: s.divisions }));
}

export async function getSeason(id: string, options: Visibility = { includeDrafts: true }) {
  const season = await prisma.season.findFirst({ where: { id, ...visible(options) } });
  if (!season) throw notFound('Season not found');
  return toSeasonDto(season);
}

export async function getSeasonBySlug(slug: string): Promise<SeasonDto | null> {
  const season = await prisma.season.findUnique({ where: { slug } });
  return season ? toSeasonDto(season) : null;
}

async function takenSlugs(excludeId?: string) {
  const rows = await prisma.season.findMany({
    where: excludeId ? { id: { not: excludeId } } : undefined,
    select: { slug: true },
  });
  return rows.map((r) => r.slug);
}

export async function createSeason(input: SeasonInput): Promise<SeasonDto> {
  const season = await prisma.season.create({
    data: {
      ...input,
      slug: uniqueSlug(input.name, await takenSlugs()),
      startDate: toDate(input.startDate),
      endDate: toDate(input.endDate),
    },
  });
  return toSeasonDto(season);
}

export async function updateSeason(id: string, input: SeasonUpdate): Promise<SeasonDto> {
  const current = await getSeason(id);
  const startDate = input.startDate ?? current.startDate;
  const endDate = input.endDate ?? current.endDate;
  if (endDate < startDate) throw badRequest('The season must end after it starts');

  const season = await prisma.season.update({
    where: { id },
    data: {
      ...input,
      slug:
        input.name && input.name !== current.name
          ? uniqueSlug(input.name, await takenSlugs(id))
          : undefined,
      startDate: input.startDate ? toDate(input.startDate) : undefined,
      endDate: input.endDate ? toDate(input.endDate) : undefined,
    },
  });
  return toSeasonDto(season);
}

export async function deleteSeason(id: string): Promise<void> {
  await getSeason(id);
  await prisma.season.delete({ where: { id } });
}
