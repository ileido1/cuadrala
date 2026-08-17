import { ListTournamentsUseCase } from '../../application/use_cases/list_tournaments.use_case.js';
import { ListTournamentsByVenueUseCase } from '../../application/use_cases/list_tournaments_by_venue.use_case.js';
import { GetTournamentUseCase } from '../../application/use_cases/get_tournament.use_case.js';
import { CreateParametrizedTournamentUseCase } from '../../application/use_cases/create_parametrized_tournament.use_case.js';
import { UpdateTournamentStatusUseCase } from '../../application/use_cases/update_tournament_status.use_case.js';
import { AssertTournamentOrganizerAccessUseCase } from '../../application/use_cases/assert_tournament_organizer_access.use_case.js';
import { MaterializeTournamentMatchesUseCase } from '../../application/use_cases/materialize_tournament_matches.use_case.js';
import { PrismaTournamentQueryRepository } from '../../infrastructure/adapters/prisma_tournament_query_repository.js';
import { PrismaCategoryRepository } from '../../infrastructure/adapters/prisma_category_repository.js';
import { PrismaSportRepository } from '../../infrastructure/adapters/prisma_sport_repository.js';
import { PrismaFormatPresetRepository } from '../../infrastructure/adapters/prisma_format_preset_repository.js';
import { PrismaTournamentRepository } from '../../infrastructure/adapters/prisma_tournament_repository.js';
import { PrismaTournamentScheduleRepository } from '../../infrastructure/adapters/prisma_tournament_schedule_repository.js';
import { PrismaTournamentMatchMaterializationRepository } from '../../infrastructure/adapters/prisma_tournament_match_materialization_repository.js';
import { PrismaVenueStaffRepository } from '../../infrastructure/adapters/prisma_venue_staff_repository.js';
import { PRISMA } from '../../infrastructure/prisma_client.js';
import { DefaultTournamentFormatParametersValidator } from '../../domain/services/tournament/tournament_format_parameters_validator.js';

const TOURNAMENT_QUERY_REPOSITORY = new PrismaTournamentQueryRepository();
const CATEGORY_REPOSITORY = new PrismaCategoryRepository();
const SPORT_REPOSITORY = new PrismaSportRepository();
const FORMAT_PRESET_REPOSITORY = new PrismaFormatPresetRepository();
const TOURNAMENT_REPOSITORY = new PrismaTournamentRepository();
const TOURNAMENT_SCHEDULE_REPOSITORY = new PrismaTournamentScheduleRepository();
const TOURNAMENT_MATCH_MATERIALIZATION_REPOSITORY = new PrismaTournamentMatchMaterializationRepository();
const VENUE_STAFF_REPOSITORY = new PrismaVenueStaffRepository(PRISMA);
const FORMAT_VALIDATOR = new DefaultTournamentFormatParametersValidator();
const ASSERT_TOURNAMENT_ORGANIZER_ACCESS_UC = new AssertTournamentOrganizerAccessUseCase(
  VENUE_STAFF_REPOSITORY,
);
const MATERIALIZE_TOURNAMENT_MATCHES_UC = new MaterializeTournamentMatchesUseCase(
  TOURNAMENT_SCHEDULE_REPOSITORY,
  TOURNAMENT_MATCH_MATERIALIZATION_REPOSITORY,
);

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
export const UPDATE_TOURNAMENT_STATUS_UC = new UpdateTournamentStatusUseCase(
  TOURNAMENT_REPOSITORY,
  ASSERT_TOURNAMENT_ORGANIZER_ACCESS_UC,
  MATERIALIZE_TOURNAMENT_MATCHES_UC,
);