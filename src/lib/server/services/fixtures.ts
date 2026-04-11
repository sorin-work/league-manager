import { generateFixtures, shuffle } from '@/lib/domain/fixtures';
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

  const seed = input.seed ?? Math.floor(Math.random() * 2 ** 31);
  const order = teams.map((t) => t.id);
  const rounds = generateFixtures(
    input.shuffle ? shuffle(order, seed) : order,
    input.format ?? division.format,
  );
  const matches = scheduleFixtures(rounds, {
    ...input,
    homeVenues: Object.fromEntries(teams.map((t) => [t.id, t.homeVenueId])),
    timeZone: division.season.timezone,
  });

  const data = matches.map((m) => ({ ...m, divisionId }));
  await prisma.$transaction(
    async (tx) => {
      // Serialise generation per division: a double click sends two requests
      // that would otherwise both pass the "no fixtures yet" check above.
      await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${divisionId}))`;
      const created = await tx.match.count({ where: { divisionId } });
      if (created > 0) throw conflict('This division already has fixtures');
      await tx.match.createMany({ data });
    },
    { timeout: 15_000 },
  );
  return {
    rounds: rounds.length,
    matches: matches.length,
    ...(input.shuffle ? { seed } : {}),
  };
}

/** Removes all fixtures of a division, as long as no result has been entered. */
export async function clearDivisionFixtures(divisionId: string) {
  await getDivision(divisionId);
  const played = await prisma.match.count({ where: { divisionId, status: 'PLAYED' } });
  if (played > 0) throw conflict('Results have already been entered for this division');
  const { count } = await prisma.match.deleteMany({ where: { divisionId } });
  return { deleted: count };
}
