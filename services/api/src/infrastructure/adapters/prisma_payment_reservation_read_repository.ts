import type {
  PaymentReservationDetailDTO,
  PaymentReservationReadRepository,
} from '../../domain/ports/payment_reservation_read_repository.js';

import { PRISMA } from '../prisma_client.js';

export class PrismaPaymentReservationReadRepository
  implements PaymentReservationReadRepository
{
  async findByIdSV(_reservationId: string): Promise<PaymentReservationDetailDTO | null> {
    const ROW = await PRISMA.reservation.findUnique({
      where: { id: _reservationId },
      include: { venue: true, court: true },
    });
    if (ROW === null) {
      return null;
    }
    return {
      id: ROW.id,
      durationMinutes: ROW.durationMinutes,
      totalAmountCents: ROW.totalAmountCents,
      court: ROW.court
        ? {
            pricePerHourCents: ROW.court.pricePerHourCents,
            durationMinutes: ROW.court.durationMinutes,
          }
        : null,
    };
  }

  async updateTotalAmountCentsSV(
    _reservationId: string,
    _totalAmountCents: number,
  ): Promise<void> {
    await PRISMA.reservation.update({
      where: { id: _reservationId },
      data: { totalAmountCents: _totalAmountCents },
    });
  }
}
