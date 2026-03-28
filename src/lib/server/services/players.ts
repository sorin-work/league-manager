import { Prisma } from '@prisma/client';
import { parseRosterCsv } from '@/lib/domain/roster-csv';
import type { PlayerInput, PlayerUpdate } from '@/lib/validation';
import { prisma } from '../db';
import { badRequest, conflict, notFound } from '../http';
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

/**
 * Adds every player from a CSV file, or nothing at all when a row is invalid
 * or a shirt number is already taken.
 */
export async function importRoster(teamId: string, csv: string, options: { replace: boolean }) {
  const team = await getTeam(teamId);
  const { players, errors } = parseRosterCsv(csv);
  if (errors.length > 0) throw badRequest('Some rows could not be read', errors);
  if (players.length === 0) throw badRequest('No players found in the file');

  if (!options.replace) {
    const taken = new Set(team.players.map((p) => p.shirtNumber).filter((n) => n !== null));
    const clashes = players.filter((p) => p.shirtNumber !== null && taken.has(p.shirtNumber));
    if (clashes.length > 0) {
      throw conflict(
        `Shirt numbers already taken: ${clashes.map((p) => p.shirtNumber).join(', ')}`,
      );
    }
  }

  await prisma.$transaction(async (tx) => {
    if (options.replace) {
      const used = await tx.matchEvent.count({ where: { player: { teamId } } });
      if (used > 0) throw conflict('Players with goals or cards cannot be replaced');
      await tx.player.deleteMany({ where: { teamId } });
    }
    await tx.player.createMany({ data: players.map((p) => ({ ...p, teamId })) });
  });
  return { imported: players.length };
}

export async function deletePlayer(id: string) {
  await getPlayer(id);
  await prisma.player.delete({ where: { id } });
}
