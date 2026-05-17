import { CreateAmericanoUseCase } from '../../application/use_cases/create_americano.use_case.js';
import { PrismaAmericanoMatchWriteRepository } from '../../infrastructure/adapters/prisma_americano_match_write_repository.js';
import { PrismaCategoryRepository } from '../../infrastructure/adapters/prisma_category_repository.js';
import { PrismaCourtRepository } from '../../infrastructure/adapters/prisma_court_repository.js';
import { PrismaFormatPresetRepository } from '../../infrastructure/adapters/prisma_format_preset_repository.js';
import { PrismaSportRepository } from '../../infrastructure/adapters/prisma_sport_repository.js';
import { PrismaTournamentRepository } from '../../infrastructure/adapters/prisma_tournament_repository.js';
import { PrismaUserRepository } from '../../infrastructure/adapters/prisma_user_repository.js';

const CATEGORY_REPOSITORY = new PrismaCategoryRepository();
const COURT_REPOSITORY = new PrismaCourtRepository();
const USER_REPOSITORY = new PrismaUserRepository();
const TOURNAMENT_REPOSITORY = new PrismaTournamentRepository();
const SPORT_REPOSITORY = new PrismaSportRepository();
const FORMAT_PRESET_REPOSITORY = new PrismaFormatPresetRepository();
const AMERICANO_MATCH_WRITE_REPOSITORY = new PrismaAmericanoMatchWriteRepository();

export const CREATE_AMERICANO_UC = new CreateAmericanoUseCase(
  CATEGORY_REPOSITORY,
  COURT_REPOSITORY,
  USER_REPOSITORY,
  TOURNAMENT_REPOSITORY,
  SPORT_REPOSITORY,
  FORMAT_PRESET_REPOSITORY,
  AMERICANO_MATCH_WRITE_REPOSITORY,
);
