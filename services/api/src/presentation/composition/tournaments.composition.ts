import { ListTournamentsUseCase } from '../../application/use_cases/list_tournaments.use_case.js';
import { GetTournamentUseCase } from '../../application/use_cases/get_tournament.use_case.js';
import { PrismaTournamentQueryRepository } from '../../infrastructure/adapters/prisma_tournament_query_repository.js';

const TOURNAMENT_QUERY_REPOSITORY = new PrismaTournamentQueryRepository();

export const LIST_TOURNAMENTS_UC = new ListTournamentsUseCase(TOURNAMENT_QUERY_REPOSITORY);
export const GET_TOURNAMENT_UC = new GetTournamentUseCase(TOURNAMENT_QUERY_REPOSITORY);