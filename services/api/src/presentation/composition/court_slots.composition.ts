import { GetCourtAvailabilityUseCase } from '../../application/use_cases/get_court_availability.use_case.js';
import { PrismaMatchCourtAvailabilityRepository } from '../../infrastructure/adapters/prisma_match_court_availability_repository.js';

const MATCH_COURT_AVAILABILITY_REPOSITORY = new PrismaMatchCourtAvailabilityRepository();

export const GET_COURT_AVAILABILITY_UC = new GetCourtAvailabilityUseCase(
  MATCH_COURT_AVAILABILITY_REPOSITORY,
);
