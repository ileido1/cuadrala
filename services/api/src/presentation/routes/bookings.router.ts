/**
 * Rutas de Backoffice Bookings — API unificada de reservas y partidos.
 * Design: sdd/unificar-match-reservation (PR4 — API Routes & Controllers)
 *
 * Endpoints bajo /venues/:venueId/bookings
 */

import { Router } from 'express';

import {
  listBookingsCON,
  createBookingCON,
  getBookingCON,
  updateBookingCON,
  cancelBookingCON,
} from '../controllers/bookings.controller.js';
import { asyncHandler } from '../middleware/async_handler.js';
import { requireAuth } from '../middleware/auth.middleware.js';

export const BOOKINGS_ROUTER = Router();

// GET /venues/:venueId/bookings — listar bookings (reemplaza matches + reservations)
BOOKINGS_ROUTER.get(
  '/venues/:venueId/bookings',
  requireAuth,
  asyncHandler(listBookingsCON),
);

// POST /venues/:venueId/bookings — crear cualquier tipo (DIRECT, BLOCKED, MATCH)
BOOKINGS_ROUTER.post(
  '/venues/:venueId/bookings',
  requireAuth,
  asyncHandler(createBookingCON),
);

// GET /venues/:venueId/bookings/:bookingId — obtener booking individual
BOOKINGS_ROUTER.get(
  '/venues/:venueId/bookings/:bookingId',
  requireAuth,
  asyncHandler(getBookingCON),
);

// PATCH /venues/:venueId/bookings/:bookingId — actualizar booking
BOOKINGS_ROUTER.patch(
  '/venues/:venueId/bookings/:bookingId',
  requireAuth,
  asyncHandler(updateBookingCON),
);

// DELETE /venues/:venueId/bookings/:bookingId — cancelar booking
BOOKINGS_ROUTER.delete(
  '/venues/:venueId/bookings/:bookingId',
  requireAuth,
  asyncHandler(cancelBookingCON),
);