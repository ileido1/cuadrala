import { CreateParametrizedTournamentUseCase } from '../../application/use_cases/create_parametrized_tournament.use_case.js';
import { TournamentFormatParametersValidatorService } from '../../application/services/tournament_format_parameters_validator.service.js';
import { PrismaCategoryRepository } from '../../infrastructure/adapters/prisma_category_repository.js';
import { PrismaFormatPresetRepository } from '../../infrastructure/adapters/prisma_format_preset_repository.js';
import { PrismaSportRepository } from '../../infrastructure/adapters/prisma_sport_repository.js';
import { PrismaTournamentRepository } from '../../infrastructure/adapters/prisma_tournament_repository.js';

const CATEGORY_REPOSITORY = new PrismaCategoryRepository();
const SPORT_REPOSITORY = new PrismaSportRepository();
const FORMAT_PRESET_REPOSITORY = new PrismaFormatPresetRepository();
const TOURNAMENT_REPOSITORY = new PrismaTournamentRepository();
const TOURNAMENT_FORMAT_PARAMETERS_VALIDATOR = new TournamentFormatParametersValidatorService();

export const CREATE_PARAMETRIZED_TOURNAMENT_UC = new CreateParametrizedTournamentUseCase(
  CATEGORY_REPOSITORY,
  SPORT_REPOSITORY,
  FORMAT_PRESET_REPOSITORY,
  TOURNAMENT_REPOSITORY,
  TOURNAMENT_FORMAT_PARAMETERS_VALIDATOR,
);

