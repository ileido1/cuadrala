/**
 * Composición de use cases de Booking.
 */

import {
  CancelBookingUseCase,
  CreateBookingUseCase,
  GetBookingUseCase,
  ListBookingsUseCase,
  UpdateBookingUseCase,
} from '../../application/use_cases/booking.use_cases.js';
import { PrismaBookingRepository } from '../../infrastructure/adapters/prisma_booking_repository.js';
import { PrismaBookingCatalogReadRepository } from '../../infrastructure/adapters/prisma_booking_catalog_read_repository.js';
import { PrismaCourtRepository } from '../../infrastructure/adapters/prisma_court_repository.js';
import { PrismaVenueStaffRepository } from '../../infrastructure/adapters/prisma_venue_staff_repository.js';
import { PRISMA } from '../../infrastructure/prisma_client.js';

const BOOKING_REPOSITORY = new PrismaBookingRepository(PRISMA);
const VENUE_STAFF_REPOSITORY = new PrismaVenueStaffRepository();
const COURT_REPOSITORY = new PrismaCourtRepository();
const CATALOG_READ_REPOSITORY = new PrismaBookingCatalogReadRepository();

export const CREATE_BOOKING_UC = new CreateBookingUseCase(
  BOOKING_REPOSITORY,
  VENUE_STAFF_REPOSITORY,
  COURT_REPOSITORY,
  CATALOG_READ_REPOSITORY,
);

export const LIST_BOOKINGS_UC = new ListBookingsUseCase(
  BOOKING_REPOSITORY,
  VENUE_STAFF_REPOSITORY,
);

export const GET_BOOKING_UC = new GetBookingUseCase(
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
