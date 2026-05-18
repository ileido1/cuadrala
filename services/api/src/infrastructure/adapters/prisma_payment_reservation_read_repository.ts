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
      include: {
        venue: true,
        court: { include: { pricingTiers: true } },
      },
    });
    if (ROW === null) {
      return null;
    }
    return {
      id: ROW.id,
      venueId: ROW.venueId,
      durationMinutes: ROW.durationMinutes,
      totalAmountCents: ROW.totalAmountCents,
      pricingCurrency: ROW.pricingCurrency,
      totalAmountMinor: ROW.totalAmountMinor,
      paidAmountMinor: ROW.paidAmountMinor,
      scheduledAt: ROW.scheduledAt,
      court: ROW.court
        ? {
            pricePerHourCents: ROW.court.pricePerHourCents,
            durationMinutes: ROW.court.durationMinutes,
            pricingTiers: ROW.court.pricingTiers.map((t) => ({
              startTime: t.startTime,
              endTime: t.endTime,
              pricePerHourCents: t.pricePerHourCents,
            })),
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
