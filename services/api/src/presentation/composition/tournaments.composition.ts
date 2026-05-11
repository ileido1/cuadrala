import { ListTournamentsUseCase } from '../../application/use_cases/list_tournaments.use_case.js';
import { ListTournamentsByVenueUseCase } from '../../application/use_cases/list_tournaments_by_venue.use_case.js';
import { GetTournamentUseCase } from '../../application/use_cases/get_tournament.use_case.js';
import { CreateParametrizedTournamentUseCase } from '../../application/use_cases/create_parametrized_tournament.use_case.js';
import { PrismaTournamentQueryRepository } from '../../infrastructure/adapters/prisma_tournament_query_repository.js';
import { PrismaCategoryRepository } from '../../infrastructure/adapters/prisma_category_repository.js';
import { PrismaSportRepository } from '../../infrastructure/adapters/prisma_sport_repository.js';
import { PrismaFormatPresetRepository } from '../../infrastructure/adapters/prisma_format_preset_repository.js';
import { PrismaTournamentRepository } from '../../infrastructure/adapters/prisma_tournament_repository.js';
import { TournamentFormatParametersValidatorService } from '../../application/services/tournament_format_parameters_validator.service.js';

const TOURNAMENT_QUERY_REPOSITORY = new PrismaTournamentQueryRepository();
const CATEGORY_REPOSITORY = new PrismaCategoryRepository();
const SPORT_REPOSITORY = new PrismaSportRepository();
const FORMAT_PRESET_REPOSITORY = new PrismaFormatPresetRepository();
const TOURNAMENT_REPOSITORY = new PrismaTournamentRepository();
const FORMAT_VALIDATOR = new TournamentFormatParametersValidatorService();

export const LIST_TOURNAMENTS_UC = new ListTournamentsUseCase(TOURNAMENT_QUERY_REPOSITORY);
export const GET_TOURNAMENT_UC = new GetTournamentUseCase(TOURNAMENT_QUERY_REPOSITORY);
export const LIST_TOURNAMENTS_BY_VENUE_UC = new ListTournamentsByVenueUseCase(TOURNAMENT_QUERY_REPOSITORY);
export const CREATE_PARAMETRIZED_TOURNAMENT_UC = new CreateParametrizedTournamentUseCase(
  CATEGORY_REPOSITORY,
  SPORT_REPOSITORY,
  FORMAT_PRESET_REPOSITORY,
  TOURNAMENT_REPOSITORY,
  FORMAT_VALIDATOR,
);