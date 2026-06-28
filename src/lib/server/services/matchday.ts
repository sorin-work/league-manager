import { addDays } from '@/lib/domain/schedule';
import { toLocalInput } from '@/lib/domain/time';
import { prisma } from '../db';
import { matchInclude } from './matches';

const publicSeason = { division: { season: { status: { not: 'DRAFT' as const } } } };
const include = { ...matchInclude, division: { include: { season: true } } };

const localDate = (m: { kickoffAt: Date | null; division: { season: { timezone: string } } }) =>
  m.kickoffAt ? toLocalInput(m.kickoffAt, m.division.season.timezone).slice(0, 10) : null;

/**
 * Every public match on a calendar date, where the date is taken in each
 * season's own time zone. Also returns the nearest match days either side.
 */
export async function getMatchday(date: string) {
  // a day in any time zone falls inside this UTC window
  const from = new Date(`${addDays(date, -1)}T00:00:00Z`);
  const to = new Date(`${addDays(date, 2)}T00:00:00Z`);
  const candidates = await prisma.match.findMany({
    where: { ...publicSeason, kickoffAt: { gte: from, lt: to } },
    include,
    orderBy: [{ kickoffAt: 'asc' }, { id: 'asc' }],
  });
  const matches = candidates.filter((m) => localDate(m) === date);

  const [before, after] = await Promise.all([
    prisma.match.findMany({
      where: { ...publicSeason, kickoffAt: { lt: new Date(`${date}T00:00:00Z`) } },
      include,
      orderBy: { kickoffAt: 'desc' },
      take: 20,
    }),
    prisma.match.findMany({
      where: { ...publicSeason, kickoffAt: { gte: new Date(`${addDays(date, 1)}T00:00:00Z`) } },
      include,
      orderBy: { kickoffAt: 'asc' },
      take: 20,
    }),
  ]);
  const previous = before.map(localDate).find((d) => d !== null && d < date) ?? null;
  const next = after.map(localDate).find((d) => d !== null && d > date) ?? null;

  return { date, matches, previous, next };
}
