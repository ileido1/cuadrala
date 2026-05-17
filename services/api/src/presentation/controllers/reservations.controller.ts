/**
 * Controlador de Backoffice Reservations API.
 */

import type { Request, Response } from 'express';

import { AppError } from '../../domain/errors/app_error.js';
import { ReservationStatus, ReservationType } from '../../domain/entities/booking/reservation.entity.js';
import {
  CANCEL_RESERVATION_UC,
  CREATE_RESERVATION_UC,
  LIST_RESERVATIONS_UC,
  UNBLOCK_COURT_SLOT_UC,
} from '../composition/reservations.composition.js';
import {
  CREATE_RESERVATION_BODY_SCHEMA,
  LIST_RESERVATIONS_QUERY_SCHEMA,
  RESERVATION_ID_PARAM_SCHEMA,
  VENUE_ID_PARAM_SCHEMA,
  COURT_ID_PARAM_SCHEMA,
  BLOCK_SLOT_BODY_SCHEMA,
} from '../validation/reservations.validation.js';

export async function postReservationCON(_req: Request, _res: Response): Promise<void> {
  const ACTOR_USER_ID = _req.authUser?.id;
  if (ACTOR_USER_ID === undefined) {
    throw new AppError('NO_AUTORIZADO', 'Sesion no disponible.', 401);
  }

  const PARAMS = VENUE_ID_PARAM_SCHEMA.parse(_req.params);
  const BODY = CREATE_RESERVATION_BODY_SCHEMA.parse(_req.body);

  let responsibleName: string | undefined;
  let responsiblePhone: string | undefined;
  if (BODY.responsible !== undefined) {
    if (BODY.responsible.type === 'GUEST') {
      responsibleName = BODY.responsible.name;
      responsiblePhone = BODY.responsible.phone;
    }
  }

  const RESULT = await CREATE_RESERVATION_UC.executeSV(
    {
      venueId: PARAMS.venueId,
      courtId: BODY.courtId,
      ...(BODY.categoryId !== undefined ? { categoryId: BODY.categoryId } : {}),
      type: BODY.type,
      scheduledAt: new Date(BODY.scheduledAt),
      ...(BODY.durationMinutes !== undefined ? { durationMinutes: BODY.durationMinutes } : {}),
      ...(BODY.notes !== undefined ? { notes: BODY.notes } : {}),
      ...(responsibleName !== undefined ? { responsibleName } : {}),
      ...(responsiblePhone !== undefined ? { responsiblePhone } : {}),
    },
    ACTOR_USER_ID,
  );

  _res.status(201).json({
    success: true,
    message: 'Reserva creada correctamente.',
    data: RESULT.reservation,
  });
}

export async function listReservationsCON(_req: Request, _res: Response): Promise<void> {
  const ACTOR_USER_ID = _req.authUser?.id;
  if (ACTOR_USER_ID === undefined) {
    throw new AppError('NO_AUTORIZADO', 'Sesion no disponible.', 401);
  }

  const PARAMS = VENUE_ID_PARAM_SCHEMA.parse(_req.params);
  const QUERY = LIST_RESERVATIONS_QUERY_SCHEMA.parse(_req.query);

  const RESULT = await LIST_RESERVATIONS_UC.executeSV(
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
      page: QUERY.page,
      limit: QUERY.limit,
    },
    ACTOR_USER_ID,
  );

  _res.status(200).json({
    success: true,
    message: 'Reservas obtenidas correctamente.',
    data: RESULT,
  });
}

export async function deleteReservationCON(_req: Request, _res: Response): Promise<void> {
  const ACTOR_USER_ID = _req.authUser?.id;
  if (ACTOR_USER_ID === undefined) {
    throw new AppError('NO_AUTORIZADO', 'Sesion no disponible.', 401);
  }

  const PARAMS = RESERVATION_ID_PARAM_SCHEMA.parse(_req.params);
  const RESULT = await CANCEL_RESERVATION_UC.executeSV(
    { reservationId: PARAMS.reservationId },
    ACTOR_USER_ID,
  );

  _res.status(200).json({
    success: true,
    message: 'Reserva cancelada correctamente.',
    data: RESULT.reservation,
  });
}

export async function postBlockSlotCON(_req: Request, _res: Response): Promise<void> {
  const ACTOR_USER_ID = _req.authUser?.id;
  if (ACTOR_USER_ID === undefined) {
    throw new AppError('NO_AUTORIZADO', 'Sesion no disponible.', 401);
  }

  const PARAMS = {
    ...VENUE_ID_PARAM_SCHEMA.parse(_req.params),
    ...COURT_ID_PARAM_SCHEMA.parse(_req.params),
  };
  const BODY = BLOCK_SLOT_BODY_SCHEMA.parse(_req.body);

  const RESULT = await CREATE_RESERVATION_UC.executeSV(
    {
      venueId: PARAMS.venueId,
      courtId: PARAMS.courtId,
      type: ReservationType.BLOCKED,
      scheduledAt: new Date(BODY.scheduledAt),
      durationMinutes: BODY.durationMinutes,
      notes: BODY.notes ?? null,
    },
    ACTOR_USER_ID,
  );

  _res.status(201).json({
    success: true,
    message: 'Horario bloqueado correctamente.',
    data: RESULT.reservation,
  });
}

export async function deleteBlockSlotCON(_req: Request, _res: Response): Promise<void> {
  const ACTOR_USER_ID = _req.authUser?.id;
  if (ACTOR_USER_ID === undefined) {
    throw new AppError('NO_AUTORIZADO', 'Sesion no disponible.', 401);
  }

  const PARAMS = {
    ...VENUE_ID_PARAM_SCHEMA.parse(_req.params),
    ...COURT_ID_PARAM_SCHEMA.parse(_req.params),
  };
  const BODY = BLOCK_SLOT_BODY_SCHEMA.parse(_req.body);

  const RESULT = await UNBLOCK_COURT_SLOT_UC.executeSV(
    {
      venueId: PARAMS.venueId,
      courtId: PARAMS.courtId,
      scheduledAt: new Date(BODY.scheduledAt),
    },
    ACTOR_USER_ID,
  );

  _res.status(200).json({
    success: true,
    message: 'Horario desbloqueado correctamente.',
    data: RESULT.reservation,
  });
}
