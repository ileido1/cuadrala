import { GetTournamentBracketUseCase } from '../../application/use_cases/get_tournament_bracket.use_case.js';
import { RegisterTournamentMatchResultUseCase } from '../../application/use_cases/register_tournament_match_result.use_case.js';
import { PrismaTournamentQueryRepository } from '../../infrastructure/adapters/prisma_tournament_query_repository.js';
import { PrismaVenueStaffRepository } from '../../infrastructure/adapters/prisma_venue_staff_repository.js';
import { PrismaMatchCrudRepository } from '../../infrastructure/adapters/prisma_match_crud_repository.js';

const TOURNAMENT_QUERY_REPOSITORY = new PrismaTournamentQueryRepository();
const VENUE_STAFF_REPOSITORY = new PrismaVenueStaffRepository();
const MATCH_CRUD_REPOSITORY = new PrismaMatchCrudRepository();

export const GET_TOURNAMENT_BRACKET_UC = new GetTournamentBracketUseCase(
  TOURNAMENT_QUERY_REPOSITORY,
  MATCH_CRUD_REPOSITORY,
);

export const REGISTER_TOURNAMENT_MATCH_RESULT_UC = new RegisterTournamentMatchResultUseCase(
  TOURNAMENT_QUERY_REPOSITORY,
  VENUE_STAFF_REPOSITORY,
  MATCH_CRUD_REPOSITORY,
);
