import { GetTournamentScoreboardUseCase } from '../../application/use_cases/get_tournament_scoreboard.use_case.js';
import { PrismaTournamentRepository } from '../../infrastructure/adapters/prisma_tournament_repository.js';
import { PrismaTournamentScoreboardRepository } from '../../infrastructure/adapters/prisma_tournament_scoreboard_repository.js';

const TOURNAMENT_REPOSITORY = new PrismaTournamentRepository();
const SCOREBOARD_REPOSITORY = new PrismaTournamentScoreboardRepository();

export const GET_TOURNAMENT_SCOREBOARD_UC = new GetTournamentScoreboardUseCase(
  TOURNAMENT_REPOSITORY,
  SCOREBOARD_REPOSITORY,
);

