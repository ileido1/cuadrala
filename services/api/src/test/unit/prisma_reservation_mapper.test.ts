import { describe, expect, it } from 'vitest';

import { ReservationStatus, ReservationType } from '../../domain/entities/booking/reservation.entity.js';
import { mapPrismaReservationRowToDtoSV } from '../../infrastructure/adapters/prisma_reservation_mapper.js';

describe('mapPrismaReservationRowToDtoSV', () => {
  it('should map prisma reservation row to ReservationDTO', () => {
    const SCHEDULED_AT = new Date('2026-05-15T10:00:00.000Z');
    const CREATED_AT = new Date('2026-05-14T12:00:00.000Z');
    const UPDATED_AT = new Date('2026-05-14T12:00:00.000Z');

    const DTO = mapPrismaReservationRowToDtoSV({
      id: 'res-1',
      venueId: 'venue-1',
      courtId: 'court-1',
      sportId: 'sport-1',
      categoryId: 'cat-1',
      type: 'DIRECT',
      status: 'CONFIRMED',
      scheduledAt: SCHEDULED_AT,
      durationMinutes: 60,
      notes: 'Nota',
      createdByUserId: 'user-1',
      responsibleName: 'Ana',
      responsiblePhone: '+580000',
      totalAmountCents: 5000,
      paidAmountCents: 0,
      paymentStatus: 'UNPAID',
      court: { name: 'Cancha 1' },
      createdAt: CREATED_AT,
      updatedAt: UPDATED_AT,
    });

    expect(DTO.id).toBe('res-1');
    expect(DTO.type).toBe(ReservationType.DIRECT);
    expect(DTO.status).toBe(ReservationStatus.CONFIRMED);
    expect(DTO.courtName).toBe('Cancha 1');
    expect(DTO.scheduledAt).toEqual(SCHEDULED_AT);
  });

  it('should set courtName null when court relation is missing', () => {
    const DTO = mapPrismaReservationRowToDtoSV({
      id: 'res-2',
      venueId: 'venue-1',
      courtId: 'court-1',
      sportId: 'sport-1',
      categoryId: 'cat-1',
      type: 'BLOCKED',
      status: 'CONFIRMED',
      scheduledAt: new Date(),
      durationMinutes: 30,
      notes: null,
      createdByUserId: 'user-1',
      responsibleName: null,
      responsiblePhone: null,
      totalAmountCents: null,
      paidAmountCents: 0,
      paymentStatus: 'UNPAID',
      court: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    expect(DTO.courtName).toBeNull();
    expect(DTO.type).toBe(ReservationType.BLOCKED);
  });
});
