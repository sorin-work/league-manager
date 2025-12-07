import { prisma } from '../db';
import { matchInclude } from './matches';

export async function getDashboard(now = new Date()) {
  const [seasons, teams, played, remaining, overdue] = await Promise.all([
    prisma.season.count(),
    prisma.team.count(),
    prisma.match.count({ where: { status: 'PLAYED' } }),
    prisma.match.count({ where: { status: { in: ['SCHEDULED', 'POSTPONED'] } } }),
    prisma.match.findMany({
      where: { status: 'SCHEDULED', kickoffAt: { lt: now } },
      include: { ...matchInclude, division: { include: { season: true } } },
      orderBy: { kickoffAt: 'asc' },
      take: 15,
    }),
  ]);
  return { counts: { seasons, teams, played, remaining }, overdue };
}
