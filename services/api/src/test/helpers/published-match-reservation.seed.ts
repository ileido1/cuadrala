import type { PrismaClient } from '../../generated/prisma/client.js';

/** Seed MATCH + Reservation publicada (reemplaza VacantHour en tests de integración). */
export async function seedPublishedMatchReservationSV(
  _prisma: PrismaClient,
  _data: {
    venueId: string;
    courtId: string;
    sportId: string;
    categoryId: string;
    scheduledAt: Date;
    organizerUserId: string;
  },
): Promise<{ matchId: string; reservationId: string }> {
  const MATCH = await _prisma.match.create({
    data: {
      categoryId: _data.categoryId,
      sportId: _data.sportId,
      organizerUserId: _data.organizerUserId,
      courtId: _data.courtId,
      scheduledAt: _data.scheduledAt,
      type: 'REGULAR',
      status: 'SCHEDULED',
    },
  });

  const RESERVATION = await _prisma.reservation.create({
    data: {
      venueId: _data.venueId,
      courtId: _data.courtId,
      sportId: _data.sportId,
      categoryId: _data.categoryId,
      type: 'MATCH',
      visibility: 'PUBLISHED',
      matchId: MATCH.id,
      matchStatus: 'SCHEDULED',
      scheduledAt: _data.scheduledAt,
      createdByUserId: _data.organizerUserId,
      organizerUserId: _data.organizerUserId,
      status: 'CONFIRMED',
    },
  });

  return { matchId: MATCH.id, reservationId: RESERVATION.id };
}
