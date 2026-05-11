/**
 * Controlador de Backoffice Reservations API.
 * Endpoints: POST /venues/:venueId/reservations, GET /venues/:venueId/reservations, DELETE /venues/:venueId/reservations/:reservationId
 */

import type { Request, Response } from 'express';

import { AppError } from '../../domain/errors/app_error.js';
import { PRISMA } from '../../infrastructure/prisma_client.js';
import {
  CreateReservationUseCase,
  ListReservationsUseCase,
  CancelReservationUseCase,
} from '../../application/use_cases/reservation.use_cases.js';
import { PrismaReservationRepository } from '../../infrastructure/adapters/prisma_reservation_repository.js';
import { PrismaVenueStaffRepository } from '../../infrastructure/adapters/prisma_venue_staff_repository.js';
import {
  CREATE_RESERVATION_BODY_SCHEMA,
  LIST_RESERVATIONS_QUERY_SCHEMA,
  RESERVATION_ID_PARAM_SCHEMA,
  VENUE_ID_PARAM_SCHEMA,
  COURT_ID_PARAM_SCHEMA,
  BLOCK_SLOT_BODY_SCHEMA,
} from '../validation/reservations.validation.js';
import { ReservationStatus, ReservationType } from '../../domain/entities/reservation.entity.js';

// Instancias compartidas de repositorio ( lazily initialized )
let _reservationRepo: PrismaReservationRepository | null = null;
let _venueStaffRepo: PrismaVenueStaffRepository | null = null;

function getReservationRepo(): PrismaReservationRepository {
  if (_reservationRepo === null) {
    _reservationRepo = new PrismaReservationRepository();
  }
  return _reservationRepo;
}

function getVenueStaffRepo(): PrismaVenueStaffRepository {
  if (_venueStaffRepo === null) {
    _venueStaffRepo = new PrismaVenueStaffRepository();
  }
  return _venueStaffRepo;
}

// ---------------------------------------------------------------------------
// POST /venues/:venueId/reservations
// ---------------------------------------------------------------------------

export async function postReservationCON(_req: Request, _res: Response): Promise<void> {
  const ACTOR_USER_ID = _req.authUser?.id;
  if (ACTOR_USER_ID === undefined) {
    throw new AppError('NO_AUTORIZADO', 'Sesion no disponible.', 401);
  }

  const PARAMS = VENUE_ID_PARAM_SCHEMA.parse(_req.params);
  const BODY = CREATE_RESERVATION_BODY_SCHEMA.parse(_req.body);

  const useCase = new CreateReservationUseCase(getReservationRepo(), getVenueStaffRepo());
  const result = await useCase.executeSV(
    {
      venueId: PARAMS.venueId,
      courtId: BODY.courtId,
      sportId: BODY.sportId,
      categoryId: BODY.categoryId,
      type: BODY.type,
      scheduledAt: new Date(BODY.scheduledAt),
      ...(BODY.durationMinutes !== undefined ? { durationMinutes: BODY.durationMinutes } : {}),
      ...(BODY.notes !== undefined ? { notes: BODY.notes } : {}),
    },
    ACTOR_USER_ID,
  );

  _res.status(201).json({
    success: true,
    message: 'Reserva creada correctamente.',
    data: result.reservation,
  });
}

// ---------------------------------------------------------------------------
// GET /venues/:venueId/reservations
// ---------------------------------------------------------------------------

export async function listReservationsCON(_req: Request, _res: Response): Promise<void> {
  const ACTOR_USER_ID = _req.authUser?.id;
  if (ACTOR_USER_ID === undefined) {
    throw new AppError('NO_AUTORIZADO', 'Sesion no disponible.', 401);
  }

  const PARAMS = VENUE_ID_PARAM_SCHEMA.parse(_req.params);
  const QUERY = LIST_RESERVATIONS_QUERY_SCHEMA.parse(_req.query);

  const useCase = new ListReservationsUseCase(getReservationRepo(), getVenueStaffRepo());
  const result = await useCase.executeSV(
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
    data: result,
  });
}

// ---------------------------------------------------------------------------
// DELETE /venues/:venueId/reservations/:reservationId
// ---------------------------------------------------------------------------

export async function deleteReservationCON(_req: Request, _res: Response): Promise<void> {
  const ACTOR_USER_ID = _req.authUser?.id;
  if (ACTOR_USER_ID === undefined) {
    throw new AppError('NO_AUTORIZADO', 'Sesion no disponible.', 401);
  }

  const PARAMS = RESERVATION_ID_PARAM_SCHEMA.parse(_req.params);

  const useCase = new CancelReservationUseCase(getReservationRepo(), getVenueStaffRepo());
  const result = await useCase.executeSV({ reservationId: PARAMS.reservationId }, ACTOR_USER_ID);

  _res.status(200).json({
    success: true,
    message: 'Reserva cancelada correctamente.',
    data: result.reservation,
  });
}

// ---------------------------------------------------------------------------
// POST /venues/:venueId/courts/:courtId/slots/block — bloquear horario
// ---------------------------------------------------------------------------

export async function postBlockSlotCON(_req: Request, _res: Response): Promise<void> {
  const ACTOR_USER_ID = _req.authUser?.id;
  if (ACTOR_USER_ID === undefined) {
    throw new AppError('NO_AUTORIZADO', 'Sesion no disponible.', 401);
  }

  const PARAMS = { ...VENUE_ID_PARAM_SCHEMA.parse(_req.params), ...COURT_ID_PARAM_SCHEMA.parse(_req.params) };
  const BODY = BLOCK_SLOT_BODY_SCHEMA.parse(_req.body);

  // Obtener sportId y categoryId default de la cancha
  const COURT = await PRISMA.court.findUnique({
    where: { id: PARAMS.courtId },
    select: { sportId: true, venue: { select: { id: true } } },
  });

  if (COURT === null) {
    throw new AppError('CANCHA_NO_ENCONTRADA', 'La cancha indicada no existe.', 404);
  }

  const SPORT_ID = COURT.sportId;
  const CATEGORY_ID = await PRISMA.category.findFirst({
    select: { id: true },
    orderBy: { createdAt: 'asc' },
  }).then((c) => c?.id ?? '');

  const useCase = new CreateReservationUseCase(getReservationRepo(), getVenueStaffRepo());
  const result = await useCase.executeSV(
    {
      venueId: PARAMS.venueId,
      courtId: PARAMS.courtId,
      sportId: SPORT_ID,
      categoryId: CATEGORY_ID,
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
    data: result.reservation,
  });
}

// ---------------------------------------------------------------------------
// DELETE /venues/:venueId/courts/:courtId/slots/block — desbloquear horario
// ---------------------------------------------------------------------------

export async function deleteBlockSlotCON(_req: Request, _res: Response): Promise<void> {
  const ACTOR_USER_ID = _req.authUser?.id;
  if (ACTOR_USER_ID === undefined) {
    throw new AppError('NO_AUTORIZADO', 'Sesion no disponible.', 401);
  }

  const PARAMS = { ...VENUE_ID_PARAM_SCHEMA.parse(_req.params), ...COURT_ID_PARAM_SCHEMA.parse(_req.params) };
  const BODY = BLOCK_SLOT_BODY_SCHEMA.parse(_req.body);

  // Buscar la reservation BLOCKED para este court + scheduledAt
  const RESERVATION = await PRISMA.reservation.findFirst({
    where: {
      courtId: PARAMS.courtId,
      venueId: PARAMS.venueId,
      type: 'BLOCKED',
      status: 'CONFIRMED',
      scheduledAt: new Date(BODY.scheduledAt),
    },
    select: { id: true },
  });

  if (RESERVATION === null) {
    throw new AppError('BLOQUEO_NO_ENCONTRADO', 'No existe bloqueo para este horario.', 404);
  }

  const useCase = new CancelReservationUseCase(getReservationRepo(), getVenueStaffRepo());
  const result = await useCase.executeSV({ reservationId: RESERVATION.id }, ACTOR_USER_ID);

  _res.status(200).json({
    success: true,
    message: 'Horario desbloqueado correctamente.',
    data: result.reservation,
  });
}