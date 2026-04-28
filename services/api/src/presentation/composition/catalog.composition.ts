import { ListFormatPresetsBySportUseCase } from '../../application/use_cases/list_format_presets_by_sport.use_case.js';
import { ListSportsUseCase } from '../../application/use_cases/list_sports.use_case.js';
import { PrismaFormatPresetRepository } from '../../infrastructure/adapters/prisma_format_preset_repository.js';
import { PrismaSportRepository } from '../../infrastructure/adapters/prisma_sport_repository.js';

const SPORT_REPOSITORY = new PrismaSportRepository();
const FORMAT_PRESET_REPOSITORY = new PrismaFormatPresetRepository();

export const LIST_SPORTS_UC = new ListSportsUseCase(SPORT_REPOSITORY);
export const LIST_FORMAT_PRESETS_BY_SPORT_UC = new ListFormatPresetsBySportUseCase(
  FORMAT_PRESET_REPOSITORY,
);

