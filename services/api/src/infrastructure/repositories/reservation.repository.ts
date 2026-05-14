import { PRISMA } from '../prisma_client.js';

export async function findReservationByIdRepo(_id: string) {
  return PRISMA.reservation.findUnique({
    where: { id: _id },
    include: { venue: true, court: true },
  });
}

export async function updateReservationTotalAmountCentsRepo(_id: string, _totalAmountCents: number): Promise<void> {
  await PRISMA.reservation.update({
    where: { id: _id },
    data: { totalAmountCents: _totalAmountCents },
  });
}
