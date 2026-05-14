/**
 * Composición de use cases de Booking.
 * Design: sdd/unificar-match-reservation (PR3 — Infrastructure Layer)
 */

import { PrismaBookingRepository } from '../../infrastructure/adapters/prisma_booking_repository.js';
import { PrismaVenueStaffRepository } from '../../infrastructure/adapters/prisma_venue_staff_repository.js';
import { CourtRepository } from '../../infrastructure/repositories/court.repository.js';
import { PRISMA } from '../../infrastructure/prisma_client.js';
import {
  CreateBookingUseCase,
  ListBookingsUseCase,
  CancelBookingUseCase,
  UpdateBookingUseCase,
} from '../../application/use_cases/booking.use_cases.js';

const BOOKING_REPOSITORY = new PrismaBookingRepository(PRISMA);
const VENUE_STAFF_REPOSITORY = new PrismaVenueStaffRepository();
const COURT_REPOSITORY = new CourtRepository();

export const CREATE_BOOKING_UC = new CreateBookingUseCase(
  BOOKING_REPOSITORY,
  VENUE_STAFF_REPOSITORY,
  COURT_REPOSITORY,
);

export const LIST_BOOKINGS_UC = new ListBookingsUseCase(
  BOOKING_REPOSITORY,
  VENUE_STAFF_REPOSITORY,
);

export const CANCEL_BOOKING_UC = new CancelBookingUseCase(
  BOOKING_REPOSITORY,
  VENUE_STAFF_REPOSITORY,
);

export const UPDATE_BOOKING_UC = new UpdateBookingUseCase(
  BOOKING_REPOSITORY,
  VENUE_STAFF_REPOSITORY,
);