import { PRISMA } from '../prisma_client.js';

export async function findReservationByIdRepo(_id: string) {
  return PRISMA.reservation.findUnique({ where: { id: _id } });
}
