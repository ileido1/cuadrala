/**
 * Controlador de Bookings API — endpoints unificados para reservas y partidos.
 */

import type { Request, Response } from 'express';

import { AppError } from '../../domain/errors/app_error.js';
import { ReservationStatus } from '../../domain/entities/booking/reservation.entity.js';
import {
  CANCEL_BOOKING_UC,
  CREATE_BOOKING_UC,
  GET_BOOKING_UC,
  LIST_BOOKINGS_UC,
  UPDATE_BOOKING_UC,
} from '../composition/bookings.composition.js';
import {
  CREATE_BOOKING_BODY_SCHEMA,
  LIST_BOOKINGS_QUERY_SCHEMA,
  BOOKING_ID_PARAM_SCHEMA,
  UPDATE_BOOKING_BODY_SCHEMA,
  VENUE_ID_PARAM_SCHEMA,
} from '../validation/bookings.validation.js';
import {
  mapBookingToResponseSV,
  mapBookingsListToResponseSV,
} from '../mappers/booking_response.mapper.js';

export async function listBookingsCON(_req: Request, _res: Response): Promise<void> {
  const ACTOR_USER_ID = _req.authUser?.id;
  if (ACTOR_USER_ID === undefined) {
    throw new AppError('NO_AUTORIZADO', 'Sesión no disponible.', 401);
  }

  const PARAMS = VENUE_ID_PARAM_SCHEMA.parse(_req.params);
  const QUERY = LIST_BOOKINGS_QUERY_SCHEMA.parse(_req.query);

  const RESULT = await LIST_BOOKINGS_UC.executeSV(
    {
      venueId: PARAMS.venueId,
      ...(QUERY.courtId !== undefined ? { courtId: QUERY.courtId } : {}),
      ...(QUERY.from !== undefined ? { from: QUERY.from } : {}),
      ...(QUERY.to !== undefined ? { to: QUERY.to } : {}),
      ...(QUERY.status !== undefined
        ? {
            status:
              QUERY.status === 'CONFIRMED'
                ? ReservationStatus.CONFIRMED
                : ReservationStatus.CANCELLED,
          }
        : {}),
      ...(QUERY.type !== undefined ? { type: QUERY.type } : {}),
      ...(QUERY.visibility !== undefined ? { visibility: QUERY.visibility } : {}),
      page: QUERY.page ?? 1,
      limit: QUERY.limit ?? 20,
    },
    ACTOR_USER_ID,
  );

  _res.status(200).json({
    success: true,
    message: 'Bookings obtenidos correctamente.',
    data: {
      items: mapBookingsListToResponseSV(RESULT.items),
      pageInfo: RESULT.pageInfo,
    },
  });
}

export async function createBookingCON(_req: Request, _res: Response): Promise<void> {
  const ACTOR_USER_ID = _req.authUser?.id;
  if (ACTOR_USER_ID === undefined) {
    throw new AppError('NO_AUTORIZADO', 'Sesión no disponible.', 401);
  }

  const PARAMS = VENUE_ID_PARAM_SCHEMA.parse(_req.params);
  const BODY = CREATE_BOOKING_BODY_SCHEMA.parse(_req.body);

  const RESULT = await CREATE_BOOKING_UC.executeSV(
    {
      venueId: PARAMS.venueId,
      courtId: BODY.courtId,
      ...(BODY.sportId !== undefined ? { sportId: BODY.sportId } : {}),
      ...(BODY.categoryId !== undefined ? { categoryId: BODY.categoryId } : {}),
      type: BODY.type,
      scheduledAt: new Date(BODY.scheduledAt),
      ...(BODY.durationMinutes !== undefined ? { durationMinutes: BODY.durationMinutes } : {}),
      ...(BODY.notes !== undefined ? { notes: BODY.notes } : {}),
      ...(BODY.responsibleName !== undefined ? { responsibleName: BODY.responsibleName } : {}),
      ...(BODY.responsiblePhone !== undefined ? { responsiblePhone: BODY.responsiblePhone } : {}),
      ...(BODY.organizerUserId !== undefined ? { organizerUserId: BODY.organizerUserId } : {}),
      ...(BODY.formatPresetId !== undefined ? { formatPresetId: BODY.formatPresetId } : {}),
      ...(BODY.formatParameters !== undefined ? { formatParameters: BODY.formatParameters } : {}),
      ...(BODY.maxParticipants !== undefined ? { maxParticipants: BODY.maxParticipants } : {}),
      ...(BODY.pricePerPlayerCents !== undefined ? { pricePerPlayerCents: BODY.pricePerPlayerCents } : {}),
      ...(BODY.visibility !== undefined ? { visibility: BODY.visibility } : {}),
    },
    ACTOR_USER_ID,
  );

  _res.status(201).json({
    success: true,
    message: 'Booking creado correctamente.',
    data: mapBookingToResponseSV(RESULT.booking),
  });
}

export async function getBookingCON(_req: Request, _res: Response): Promise<void> {
  const ACTOR_USER_ID = _req.authUser?.id;
  if (ACTOR_USER_ID === undefined) {
    throw new AppError('NO_AUTORIZADO', 'Sesión no disponible.', 401);
  }

  const PARAMS = BOOKING_ID_PARAM_SCHEMA.parse(_req.params);
  const BOOKING = await GET_BOOKING_UC.executeSV(
    { bookingId: PARAMS.bookingId },
    ACTOR_USER_ID,
  );

  _res.status(200).json({
    success: true,
    data: mapBookingToResponseSV(BOOKING),
  });
}

export async function updateBookingCON(_req: Request, _res: Response): Promise<void> {
  const ACTOR_USER_ID = _req.authUser?.id;
  if (ACTOR_USER_ID === undefined) {
    throw new AppError('NO_AUTORIZADO', 'Sesión no disponible.', 401);
  }

  const PARAMS = BOOKING_ID_PARAM_SCHEMA.parse(_req.params);
  const BODY = UPDATE_BOOKING_BODY_SCHEMA.parse(_req.body);

  const RESULT = await UPDATE_BOOKING_UC.executeSV(
    {
      bookingId: PARAMS.bookingId,
      ...(BODY.visibility !== undefined ? { visibility: BODY.visibility } : {}),
      ...(BODY.matchStatus !== undefined ? { matchStatus: BODY.matchStatus } : {}),
      ...(BODY.notes !== undefined ? { notes: BODY.notes } : {}),
      ...(BODY.maxParticipants !== undefined ? { maxParticipants: BODY.maxParticipants } : {}),
      ...(BODY.pricePerPlayerCents !== undefined ? { pricePerPlayerCents: BODY.pricePerPlayerCents } : {}),
      ...(BODY.formatPresetId !== undefined ? { formatPresetId: BODY.formatPresetId } : {}),
      ...(BODY.formatParameters !== undefined ? { formatParameters: BODY.formatParameters } : {}),
    },
    ACTOR_USER_ID,
  );

  _res.status(200).json({
    success: true,
    message: 'Booking actualizado correctamente.',
    data: mapBookingToResponseSV(RESULT.booking),
  });
}

export async function cancelBookingCON(_req: Request, _res: Response): Promise<void> {
  const ACTOR_USER_ID = _req.authUser?.id;
  if (ACTOR_USER_ID === undefined) {
    throw new AppError('NO_AUTORIZADO', 'Sesión no disponible.', 401);
  }

  const PARAMS = BOOKING_ID_PARAM_SCHEMA.parse(_req.params);

  const RESULT = await CANCEL_BOOKING_UC.executeSV(
    { bookingId: PARAMS.bookingId },
    ACTOR_USER_ID,
  );

  _res.status(200).json({
    success: true,
    message: 'Booking cancelado correctamente.',
    data: mapBookingToResponseSV(RESULT.booking),
  });
}
