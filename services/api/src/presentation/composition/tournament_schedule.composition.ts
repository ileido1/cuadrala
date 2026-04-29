import { GenerateTournamentScheduleUseCase } from '../../application/use_cases/generate_tournament_schedule.use_case.js';
import { GetTournamentScheduleUseCase } from '../../application/use_cases/get_tournament_schedule.use_case.js';
import { PrismaFormatPresetRepository } from '../../infrastructure/adapters/prisma_format_preset_repository.js';
import { PrismaTournamentRepository } from '../../infrastructure/adapters/prisma_tournament_repository.js';
import { PrismaTournamentScheduleRepository } from '../../infrastructure/adapters/prisma_tournament_schedule_repository.js';

const TOURNAMENT_REPOSITORY = new PrismaTournamentRepository();
const FORMAT_PRESET_REPOSITORY = new PrismaFormatPresetRepository();
const TOURNAMENT_SCHEDULE_REPOSITORY = new PrismaTournamentScheduleRepository();

export const GENERATE_TOURNAMENT_SCHEDULE_UC = new GenerateTournamentScheduleUseCase(
  TOURNAMENT_REPOSITORY,
  FORMAT_PRESET_REPOSITORY,
  TOURNAMENT_SCHEDULE_REPOSITORY,
);

export const GET_TOURNAMENT_SCHEDULE_UC = new GetTournamentScheduleUseCase(
  TOURNAMENT_REPOSITORY,
  TOURNAMENT_SCHEDULE_REPOSITORY,
);

