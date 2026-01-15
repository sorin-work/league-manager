import { generateFixtures } from '@/lib/domain/fixtures';
import { scheduleFixtures } from '@/lib/domain/schedule';
import type { GenerateFixturesInput } from '@/lib/validation';
import { prisma } from '../db';
import { badRequest, conflict } from '../http';
import { getDivision } from './divisions';

export async function generateDivisionFixtures(divisionId: string, input: GenerateFixturesInput) {
  const division = await getDivision(divisionId);

  const existing = await prisma.match.count({ where: { divisionId } });
  if (existing > 0) throw conflict('This division already has fixtures');

  const teams = await prisma.team.findMany({ where: { divisionId }, orderBy: { name: 'asc' } });
  if (teams.length < 2) throw badRequest('Add at least two teams before making fixtures');

  if (input.venueIds.length > 0) {
    const found = await prisma.venue.count({ where: { id: { in: input.venueIds } } });
    if (found !== new Set(input.venueIds).size) throw badRequest('Unknown venue');
  }

  const rounds = generateFixtures(
    teams.map((t) => t.id),
    input.format ?? division.format,
  );
  const matches = scheduleFixtures(rounds, {
    ...input,
    homeVenues: Object.fromEntries(teams.map((t) => [t.id, t.homeVenueId])),
    timeZone: division.season.timezone,
  });

  await prisma.match.createMany({ data: matches.map((m) => ({ ...m, divisionId })) });
  return { rounds: rounds.length, matches: matches.length };
}

/** Removes all fixtures of a division, as long as no result has been entered. */
export async function clearDivisionFixtures(divisionId: string) {
  await getDivision(divisionId);
  const played = await prisma.match.count({ where: { divisionId, status: 'PLAYED' } });
  if (played > 0) throw conflict('Results have already been entered for this division');
  const { count } = await prisma.match.deleteMany({ where: { divisionId } });
  return { deleted: count };
}
