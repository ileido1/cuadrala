/**
 * Rutas de Backoffice Reservations — API de gestión de reservas directas desde staff.
 * Endpoints bajo /venues/:venueId/reservations
 */

import { Router } from 'express';

import {
  postReservationCON,
  listReservationsCON,
  deleteReservationCON,
  postBlockSlotCON,
  deleteBlockSlotCON,
} from '../controllers/reservations.controller.js';
import { asyncHandler } from '../middleware/async_handler.js';
import { requireAuth } from '../middleware/auth.middleware.js';

export const RESERVATIONS_ROUTER = Router();

// POST /venues/:venueId/reservations — crear reserva directa
RESERVATIONS_ROUTER.post(
  '/venues/:venueId/reservations',
  requireAuth,
  asyncHandler(postReservationCON),
);

// GET /venues/:venueId/reservations — listar reservas con filtros
RESERVATIONS_ROUTER.get(
  '/venues/:venueId/reservations',
  requireAuth,
  asyncHandler(listReservationsCON),
);

// DELETE /venues/:venueId/reservations/:reservationId — cancelar reserva
RESERVATIONS_ROUTER.delete(
  '/venues/:venueId/reservations/:reservationId',
  requireAuth,
  asyncHandler(deleteReservationCON),
);

// POST /venues/:venueId/courts/:courtId/slots/block — bloquear horario
RESERVATIONS_ROUTER.post(
  '/venues/:venueId/courts/:courtId/slots/block',
  requireAuth,
  asyncHandler(postBlockSlotCON),
);

// DELETE /venues/:venueId/courts/:courtId/slots/block — desbloquear horario
RESERVATIONS_ROUTER.delete(
  '/venues/:venueId/courts/:courtId/slots/block',
  requireAuth,
  asyncHandler(deleteBlockSlotCON),
);