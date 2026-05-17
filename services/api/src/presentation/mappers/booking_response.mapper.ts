import type { ReservationDTO } from '../../domain/entities/booking/reservation.entity.js';

/** Serializa booking para JSON (bigint → string). */
export function mapBookingToResponseSV(_booking: ReservationDTO): Record<string, unknown> {
  return {
    ..._booking,
    scheduledAt: _booking.scheduledAt.toISOString(),
    createdAt: _booking.createdAt.toISOString(),
    updatedAt: _booking.updatedAt.toISOString(),
    totalAmountMinor:
      _booking.totalAmountMinor !== null
        ? _booking.totalAmountMinor.toString()
        : null,
    paidAmountMinor: _booking.paidAmountMinor.toString(),
  };
}

export function mapBookingsListToResponseSV(_items: ReservationDTO[]): Record<string, unknown>[] {
  return _items.map(mapBookingToResponseSV);
}
