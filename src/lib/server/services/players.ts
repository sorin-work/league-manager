import { Prisma } from '@prisma/client';
import type { PlayerInput, PlayerUpdate } from '@/lib/validation';
import { prisma } from '../db';
import { conflict, notFound } from '../http';
import { getTeam } from './teams';

function shirtTaken(err: unknown, shirtNumber: number | null | undefined) {
  if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2002') {
    return conflict(`Shirt number ${shirtNumber} is already taken in this team`);
  }
  return err;
}

export async function listPlayers(teamId: string) {
  const team = await getTeam(teamId);
  return team.players;
}

export async function getPlayer(id: string) {
  const player = await prisma.player.findUnique({ where: { id } });
  if (!player) throw notFound('Player not found');
  return player;
}

export async function addPlayer(teamId: string, input: PlayerInput) {
  await getTeam(teamId);
  try {
    return await prisma.player.create({ data: { ...input, teamId } });
  } catch (err) {
    throw shirtTaken(err, input.shirtNumber);
  }
}

export async function updatePlayer(id: string, input: PlayerUpdate) {
  await getPlayer(id);
  try {
    return await prisma.player.update({ where: { id }, data: input });
  } catch (err) {
    throw shirtTaken(err, input.shirtNumber);
  }
}

export async function deletePlayer(id: string) {
  await getPlayer(id);
  await prisma.player.delete({ where: { id } });
}
