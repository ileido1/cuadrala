import type { Request, Response } from 'express';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { ReservationStatus, ReservationType, type ReservationDTO } from '../../domain/entities/booking/reservation.entity.js';
import {
  CANCEL_RESERVATION_UC,
  CREATE_RESERVATION_UC,
} from '../../presentation/composition/reservations.composition.js';
import {
  deleteReservationCON,
  postReservationCON,
} from '../../presentation/controllers/reservations.controller.js';

const VENUE_ID = '550e8400-e29b-41d4-a716-446655440001';
const COURT_ID = '550e8400-e29b-41d4-a716-446655440002';
const RESERVATION_ID = '550e8400-e29b-41d4-a716-446655440003';

function buildReservationDTO(): ReservationDTO {
  return {
    id: RESERVATION_ID,
    venueId: VENUE_ID,
    courtId: COURT_ID,
    courtName: 'Cancha 1',
    sportId: '550e8400-e29b-41d4-a716-446655440004',
    categoryId: '550e8400-e29b-41d4-a716-446655440005',
    type: ReservationType.DIRECT,
    status: ReservationStatus.CONFIRMED,
    scheduledAt: new Date('2026-10-04T10:00:00.000Z'),
    durationMinutes: 60,
    notes: null,
    createdByUserId: '550e8400-e29b-41d4-a716-446655440006',
    responsibleName: 'Cliente',
    responsiblePhone: null,
    totalAmountCents: 5000,
    paidAmountCents: 0,
    pricingCurrency: 'ARS',
    totalAmountMinor: 5000n,
    paidAmountMinor: 0n,
    paymentStatus: 'UNPAID',
    createdAt: new Date('2026-10-01T10:00:00.000Z'),
    updatedAt: new Date('2026-10-01T10:00:00.000Z'),
  };
}

function buildResponse(): { response: Response; body: unknown; statusCode: number } {
  let body: unknown;
  let statusCode = 0;
  const response = {
    status: vi.fn((status: number) => {
      statusCode = status;
      return response;
    }),
    json: vi.fn((payload: unknown) => {
      JSON.stringify(payload);
      body = payload;
      return response;
    }),
  } as unknown as Response;

  return {
    response,
    get body() {
      return body;
    },
    get statusCode() {
      return statusCode;
    },
  };
}

afterEach(() => {
  vi.restoreAllMocks();
});

describe('legacy reservations controller JSON responses', () => {
  it('serializes bigint amounts after creating a reservation', async () => {
    vi.spyOn(CREATE_RESERVATION_UC, 'executeSV').mockResolvedValue({
      reservation: buildReservationDTO(),
    });
    const RES = buildResponse();

    await postReservationCON(
      {
        authUser: { id: '550e8400-e29b-41d4-a716-446655440006' },
        params: { venueId: VENUE_ID },
        body: {
          courtId: COURT_ID,
          scheduledAt: '2026-10-04T10:00:00Z',
        },
      } as unknown as Request,
      RES.response,
    );

    expect(RES.statusCode).toBe(201);
    expect(RES.body).toMatchObject({
      data: { totalAmountMinor: '5000', paidAmountMinor: '0' },
    });
  });

  it('serializes bigint amounts after cancelling a reservation', async () => {
    vi.spyOn(CANCEL_RESERVATION_UC, 'executeSV').mockResolvedValue({
      reservation: { ...buildReservationDTO(), status: ReservationStatus.CANCELLED },
    });
    const RES = buildResponse();

    await deleteReservationCON(
      {
        authUser: { id: '550e8400-e29b-41d4-a716-446655440006' },
        params: { reservationId: RESERVATION_ID },
      } as unknown as Request,
      RES.response,
    );

    expect(RES.statusCode).toBe(200);
    expect(RES.body).toMatchObject({
      data: { status: ReservationStatus.CANCELLED, totalAmountMinor: '5000', paidAmountMinor: '0' },
    });
  });
});
