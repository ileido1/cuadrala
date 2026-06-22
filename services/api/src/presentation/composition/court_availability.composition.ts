import { GetCourtAvailabilityUseCase } from '../../application/use_cases/get_court_availability.use_case.js';
import { PrismaMatchCourtAvailabilityRepository } from '../../infrastructure/adapters/prisma_match_court_availability_repository.js';
import { PrismaVenueRepository } from '../../infrastructure/adapters/prisma_venue_repository.js';
import { PRISMA } from '../../infrastructure/prisma_client.js';

const MATCH_COURT_AVAILABILITY_REPOSITORY = new PrismaMatchCourtAvailabilityRepository();
const VENUE_REPOSITORY = new PrismaVenueRepository(PRISMA);

export const GET_COURT_AVAILABILITY_UC = new GetCourtAvailabilityUseCase(
  MATCH_COURT_AVAILABILITY_REPOSITORY,
  VENUE_REPOSITORY,
);
