import {
  CancelReservationUseCase,
  CreateReservationUseCase,
  ListReservationsUseCase,
  UnblockCourtSlotUseCase,
} from '../../application/use_cases/reservation.use_cases.js';
import { PrismaBookingCatalogReadRepository } from '../../infrastructure/adapters/prisma_booking_catalog_read_repository.js';
import { PrismaCourtRepository } from '../../infrastructure/adapters/prisma_court_repository.js';
import { PrismaReservationRepository } from '../../infrastructure/adapters/prisma_reservation_repository.js';
import { PrismaVenueRepository } from '../../infrastructure/adapters/prisma_venue_repository.js';
import { PrismaVenueStaffRepository } from '../../infrastructure/adapters/prisma_venue_staff_repository.js';
import { PRISMA } from '../../infrastructure/prisma_client.js';

const RESERVATION_REPOSITORY = new PrismaReservationRepository();
const VENUE_STAFF_REPOSITORY = new PrismaVenueStaffRepository(PRISMA);
const COURT_REPOSITORY = new PrismaCourtRepository();
const CATALOG_READ_REPOSITORY = new PrismaBookingCatalogReadRepository();
const VENUE_REPOSITORY = new PrismaVenueRepository(PRISMA);

export const CREATE_RESERVATION_UC = new CreateReservationUseCase(
  RESERVATION_REPOSITORY,
  VENUE_STAFF_REPOSITORY,
  COURT_REPOSITORY,
  CATALOG_READ_REPOSITORY,
  VENUE_REPOSITORY,
);

export const LIST_RESERVATIONS_UC = new ListReservationsUseCase(
  RESERVATION_REPOSITORY,
  VENUE_STAFF_REPOSITORY,
);

export const CANCEL_RESERVATION_UC = new CancelReservationUseCase(
  RESERVATION_REPOSITORY,
  VENUE_STAFF_REPOSITORY,
);

export const UNBLOCK_COURT_SLOT_UC = new UnblockCourtSlotUseCase(
  RESERVATION_REPOSITORY,
  VENUE_STAFF_REPOSITORY,
);
