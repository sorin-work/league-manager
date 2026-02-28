import type { AdjustmentInput } from '@/lib/validation';
import { prisma } from '../db';
import { badRequest, notFound } from '../http';
import { getDivision } from './divisions';

export async function listAdjustments(divisionId: string) {
  await getDivision(divisionId);
  return prisma.pointsAdjustment.findMany({
    where: { divisionId },
    include: { team: { select: { id: true, name: true } } },
    orderBy: { createdAt: 'asc' },
  });
}

export async function addAdjustment(divisionId: string, input: AdjustmentInput) {
  await getDivision(divisionId);
  const team = await prisma.team.findUnique({ where: { id: input.teamId } });
  if (!team || team.divisionId !== divisionId)
    throw badRequest('That team is not in this division');
  return prisma.pointsAdjustment.create({
    data: { divisionId, teamId: input.teamId, points: input.points, reason: input.reason },
    include: { team: { select: { id: true, name: true } } },
  });
}

export async function removeAdjustment(id: string) {
  const adjustment = await prisma.pointsAdjustment.findUnique({ where: { id } });
  if (!adjustment) throw notFound('Adjustment not found');
  await prisma.pointsAdjustment.delete({ where: { id } });
}
