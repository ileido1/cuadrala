import { GenerateTournamentAmericanoScheduleUseCase } from '../../application/use_cases/generate_tournament_americano_schedule.use_case.js';
import { GetTournamentAmericanoScheduleUseCase } from '../../application/use_cases/get_tournament_americano_schedule.use_case.js';
import { PrismaTournamentAmericanoScheduleRepository } from '../../infrastructure/adapters/prisma_tournament_americano_schedule_repository.js';

const SCHEDULE_REPOSITORY = new PrismaTournamentAmericanoScheduleRepository();

export const GENERATE_TOURNAMENT_AMERICANO_SCHEDULE_UC =
  new GenerateTournamentAmericanoScheduleUseCase(SCHEDULE_REPOSITORY);

export const GET_TOURNAMENT_AMERICANO_SCHEDULE_UC = new GetTournamentAmericanoScheduleUseCase(
  SCHEDULE_REPOSITORY,
);
