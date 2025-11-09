import type { VenueInput, VenueUpdate } from '@/lib/validation';
import { prisma } from '../db';
import { notFound } from '../http';

export function listVenues() {
  return prisma.venue.findMany({ orderBy: { name: 'asc' } });
}

export async function getVenue(id: string) {
  const venue = await prisma.venue.findUnique({ where: { id } });
  if (!venue) throw notFound('Venue not found');
  return venue;
}

export function createVenue(input: VenueInput) {
  return prisma.venue.create({ data: input });
}

export async function updateVenue(id: string, input: VenueUpdate) {
  await getVenue(id);
  return prisma.venue.update({ where: { id }, data: input });
}

/** Teams and matches keep existing; they just lose their venue. */
export async function deleteVenue(id: string) {
  await getVenue(id);
  await prisma.venue.delete({ where: { id } });
}
