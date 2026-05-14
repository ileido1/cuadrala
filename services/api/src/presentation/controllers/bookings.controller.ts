/**
 * Controlador de Bookings API — endpoints unificados para reservas y partidos.
 * Design: sdd/unificar-match-reservation (PR4 — API Routes & Controllers)
 *
 * Endpoints:
 * - GET  /venues/:venueId/bookings        — listar bookings (reemplaza matches + reservations)
 * - POST /venues/:venueId/bookings        — crear cualquier tipo (DIRECT, BLOCKED, MATCH)
 * - GET  /venues/:venueId/bookings/:id    — obtener booking individual
 * - PATCH /venues/:venueId/bookings/:id   — actualizar booking
 * - DELETE /venues/:venueId/bookings/:id — cancelar booking
 */

import type { Request, Response } from 'express';

import { AppError } from '../../domain/errors/app_error.js';
import { PRISMA } from '../../infrastructure/prisma_client.js';
import {
  CREATE_BOOKING_BODY_SCHEMA,
  LIST_BOOKINGS_QUERY_SCHEMA,
  BOOKING_ID_PARAM_SCHEMA,
  UPDATE_BOOKING_BODY_SCHEMA,
  VENUE_ID_PARAM_SCHEMA,
} from '../validators/booking.schemas.js';
import {
  CreateBookingUseCase,
  ListBookingsUseCase,
  CancelBookingUseCase,
  UpdateBookingUseCase,
} from '../../application/use_cases/booking.use_cases.js';
import { PrismaBookingRepository } from '../../infrastructure/adapters/prisma_booking_repository.js';
import { PrismaVenueStaffRepository } from '../../infrastructure/adapters/prisma_venue_staff_repository.js';
import { CourtRepository } from '../../infrastructure/repositories/court.repository.js';
import { ReservationStatus } from '../../domain/entities/reservation.entity.js';

// Instancias compartidas de repositorio (inicialización lazy)
let _bookingRepo: PrismaBookingRepository | null = null;
let _venueStaffRepo: PrismaVenueStaffRepository | null = null;
let _courtRepo: CourtRepository | null = null;

function getBookingRepo(): PrismaBookingRepository {
  if (_bookingRepo === null) {
    _bookingRepo = new PrismaBookingRepository(PRISMA);
  }
  return _bookingRepo;
}

function getVenueStaffRepo(): PrismaVenueStaffRepository {
  if (_venueStaffRepo === null) {
    _venueStaffRepo = new PrismaVenueStaffRepository();
  }
  return _venueStaffRepo;
}

function getCourtRepo(): CourtRepository {
  if (_courtRepo === null) {
    _courtRepo = new CourtRepository();
  }
  return _courtRepo;
}

// ---------------------------------------------------------------------------
// GET /venues/:venueId/bookings — listar bookings
// ---------------------------------------------------------------------------

export async function listBookingsCON(_req: Request, _res: Response): Promise<void> {
  const ACTOR_USER_ID = _req.authUser?.id;
  if (ACTOR_USER_ID === undefined) {
    throw new AppError('NO_AUTORIZADO', 'Sesión no disponible.', 401);
  }

  const PARAMS = VENUE_ID_PARAM_SCHEMA.parse(_req.params);
  const QUERY = LIST_BOOKINGS_QUERY_SCHEMA.parse(_req.query);

  const useCase = new ListBookingsUseCase(getBookingRepo(), getVenueStaffRepo());
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
    data: result,
  });
}

// ---------------------------------------------------------------------------
// POST /venues/:venueId/bookings — crear booking de cualquier tipo
// ---------------------------------------------------------------------------

export async function createBookingCON(_req: Request, _res: Response): Promise<void> {
  const ACTOR_USER_ID = _req.authUser?.id;
  if (ACTOR_USER_ID === undefined) {
    throw new AppError('NO_AUTORIZADO', 'Sesión no disponible.', 401);
  }

  const PARAMS = VENUE_ID_PARAM_SCHEMA.parse(_req.params);
  const BODY = CREATE_BOOKING_BODY_SCHEMA.parse(_req.body);

  // Obtener sportId desde el sportType del court si no se provee
  let sportId = BODY.sportId;
  if (!sportId) {
    const COURT = await PRISMA.court.findUnique({
      where: { id: BODY.courtId },
      select: { sportType: true },
    });
    if (!COURT) {
      throw new AppError('CANCHA_NO_ENCONTRADA', 'La cancha no existe.', 404);
    }

    const SPORT = await PRISMA.sport.findFirst({
      where: { code: COURT.sportType },
      select: { id: true },
    });
    if (!SPORT) {
      throw new AppError('ERROR_INTERNO', 'No se encontró el deporte de la cancha.', 500);
    }
    sportId = SPORT.id;
  }

  // Si no se provee categoryId, buscar cualquier categoría como default
  let categoryId = BODY.categoryId;
  if (!categoryId) {
    const DEFAULT_CATEGORY = await PRISMA.category.findFirst({
      select: { id: true },
      orderBy: { createdAt: 'asc' },
    });
    if (!DEFAULT_CATEGORY) {
      throw new AppError('ERROR_INTERNO', 'No se encontró una categoría en el sistema.', 500);
    }
    categoryId = DEFAULT_CATEGORY.id;
  }

  const useCase = new CreateBookingUseCase(getBookingRepo(), getVenueStaffRepo(), getCourtRepo());
  const result = await useCase.executeSV(
    {
      venueId: PARAMS.venueId,
      courtId: BODY.courtId,
      sportId,
      categoryId,
      type: BODY.type,
      scheduledAt: new Date(BODY.scheduledAt),
      ...(BODY.durationMinutes !== undefined ? { durationMinutes: BODY.durationMinutes } : {}),
      ...(BODY.notes !== undefined ? { notes: BODY.notes } : {}),
      ...(BODY.responsibleName !== undefined ? { responsibleName: BODY.responsibleName } : {}),
      ...(BODY.responsiblePhone !== undefined ? { responsiblePhone: BODY.responsiblePhone } : {}),
      // MATCH-specific
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
    data: result.booking,
  });
}

// ---------------------------------------------------------------------------
// GET /venues/:venueId/bookings/:bookingId — obtener booking individual
// ---------------------------------------------------------------------------

export async function getBookingCON(_req: Request, _res: Response): Promise<void> {
  const ACTOR_USER_ID = _req.authUser?.id;
  if (ACTOR_USER_ID === undefined) {
    throw new AppError('NO_AUTORIZADO', 'Sesión no disponible.', 401);
  }

  const PARAMS = BOOKING_ID_PARAM_SCHEMA.parse(_req.params);

  const BOOKING = await getBookingRepo().findByIdSV(PARAMS.bookingId);
  if (BOOKING === null) {
    throw new AppError('BOOKING_NO_ENCONTRADO', 'Booking no encontrado.', 404);
  }

  // Autorización: el usuario debe ser staff de esta sede
  const IS_STAFF = await getVenueStaffRepo().isUserStaffOfVenueSV(ACTOR_USER_ID, BOOKING.venueId);
  if (!IS_STAFF) {
    throw new AppError(
      'NO_AUTORIZADO',
      'No tienes permisos para ver este booking.',
      403,
    );
  }

  _res.status(200).json({
    success: true,
    data: BOOKING,
  });
}

// ---------------------------------------------------------------------------
// PATCH /venues/:venueId/bookings/:bookingId — actualizar booking
// ---------------------------------------------------------------------------

export async function updateBookingCON(_req: Request, _res: Response): Promise<void> {
  const ACTOR_USER_ID = _req.authUser?.id;
  if (ACTOR_USER_ID === undefined) {
    throw new AppError('NO_AUTORIZADO', 'Sesión no disponible.', 401);
  }

  const PARAMS = BOOKING_ID_PARAM_SCHEMA.parse(_req.params);
  const BODY = UPDATE_BOOKING_BODY_SCHEMA.parse(_req.body);

  const useCase = new UpdateBookingUseCase(getBookingRepo(), getVenueStaffRepo());
  const result = await useCase.executeSV(
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
    data: result.booking,
  });
}

// ---------------------------------------------------------------------------
// DELETE /venues/:venueId/bookings/:bookingId — cancelar booking
// ---------------------------------------------------------------------------

export async function cancelBookingCON(_req: Request, _res: Response): Promise<void> {
  const ACTOR_USER_ID = _req.authUser?.id;
  if (ACTOR_USER_ID === undefined) {
    throw new AppError('NO_AUTORIZADO', 'Sesión no disponible.', 401);
  }

  const PARAMS = BOOKING_ID_PARAM_SCHEMA.parse(_req.params);

  const useCase = new CancelBookingUseCase(getBookingRepo(), getVenueStaffRepo());
  const result = await useCase.executeSV({ bookingId: PARAMS.bookingId }, ACTOR_USER_ID);

  _res.status(200).json({
    success: true,
    message: 'Booking cancelado correctamente.',
    data: result.booking,
  });
}