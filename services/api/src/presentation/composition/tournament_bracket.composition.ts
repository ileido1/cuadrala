import { GetTournamentBracketUseCase } from '../../application/use_cases/get_tournament_bracket.use_case.js';
import { RegisterTournamentMatchResultUseCase } from '../../application/use_cases/register_tournament_match_result.use_case.js';
import { AssertTournamentOrganizerAccessUseCase } from '../../application/use_cases/assert_tournament_organizer_access.use_case.js';
import { PrismaTournamentQueryRepository } from '../../infrastructure/adapters/prisma_tournament_query_repository.js';
import { PrismaVenueStaffRepository } from '../../infrastructure/adapters/prisma_venue_staff_repository.js';
import { PrismaMatchCrudRepository } from '../../infrastructure/adapters/prisma_match_crud_repository.js';
import { PrismaTournamentMatchResultRepository } from '../../infrastructure/adapters/prisma_tournament_match_result_repository.js';
import { PrismaTournamentScheduleRepository } from '../../infrastructure/adapters/prisma_tournament_schedule_repository.js';
import { PRISMA } from '../../infrastructure/prisma_client.js';

const TOURNAMENT_QUERY_REPOSITORY = new PrismaTournamentQueryRepository();
const VENUE_STAFF_REPOSITORY = new PrismaVenueStaffRepository(PRISMA);
const MATCH_CRUD_REPOSITORY = new PrismaMatchCrudRepository();
const TOURNAMENT_MATCH_RESULT_REPOSITORY = new PrismaTournamentMatchResultRepository();
const TOURNAMENT_SCHEDULE_REPOSITORY = new PrismaTournamentScheduleRepository();
const ASSERT_TOURNAMENT_ORGANIZER_ACCESS_UC = new AssertTournamentOrganizerAccessUseCase(
  VENUE_STAFF_REPOSITORY,
);

export const GET_TOURNAMENT_BRACKET_UC = new GetTournamentBracketUseCase(
  TOURNAMENT_QUERY_REPOSITORY,
  MATCH_CRUD_REPOSITORY,
  TOURNAMENT_SCHEDULE_REPOSITORY,
  TOURNAMENT_MATCH_RESULT_REPOSITORY,
);

export const REGISTER_TOURNAMENT_MATCH_RESULT_UC = new RegisterTournamentMatchResultUseCase(
  TOURNAMENT_QUERY_REPOSITORY,
  ASSERT_TOURNAMENT_ORGANIZER_ACCESS_UC,
  TOURNAMENT_MATCH_RESULT_REPOSITORY,
);
