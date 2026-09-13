import { GetProfileUseCase } from '../../application/use_cases/get_profile.use_case.js';
import { GetPlayerProfileUseCase } from '../../application/use_cases/get_player_profile.use_case.js';
import { GetUserStatsUseCase } from '../../application/use_cases/get_user_stats.use_case.js';
import { UpdateProfileUseCase } from '../../application/use_cases/update_profile.use_case.js';
import { UpdatePlayerProfileUseCase } from '../../application/use_cases/update_player_profile.use_case.js';
import { ListMyTournamentsUseCase } from '../../application/use_cases/list_my_tournaments.use_case.js';
import { PrismaUserRepository } from '../../infrastructure/adapters/prisma_user_repository.js';
import { PrismaPlayerProfileRepository } from '../../infrastructure/adapters/prisma_player_profile_repository.js';
import { PrismaUserStatsRepository } from '../../infrastructure/adapters/prisma_user_stats_repository.js';
import { PrismaUserRatingReadRepository } from '../../infrastructure/adapters/prisma_user_rating_read_repository.js';
import { PrismaTournamentQueryRepository } from '../../infrastructure/adapters/prisma_tournament_query_repository.js';

const USER_REPOSITORY = new PrismaUserRepository();
const PLAYER_PROFILE_REPOSITORY = new PrismaPlayerProfileRepository();
const USER_STATS_REPOSITORY = new PrismaUserStatsRepository();
const USER_RATING_READ_REPOSITORY = new PrismaUserRatingReadRepository();
const TOURNAMENT_QUERY_REPOSITORY = new PrismaTournamentQueryRepository();

export const GET_PROFILE_UC = new GetProfileUseCase(USER_REPOSITORY, USER_RATING_READ_REPOSITORY);
export const UPDATE_PROFILE_UC = new UpdateProfileUseCase(USER_REPOSITORY);
export const GET_PLAYER_PROFILE_UC = new GetPlayerProfileUseCase(PLAYER_PROFILE_REPOSITORY);
export const UPDATE_PLAYER_PROFILE_UC = new UpdatePlayerProfileUseCase(
  PLAYER_PROFILE_REPOSITORY,
  USER_REPOSITORY,
);
export const GET_USER_STATS_UC = new GetUserStatsUseCase(USER_STATS_REPOSITORY);
export const LIST_MY_TOURNAMENTS_UC = new ListMyTournamentsUseCase(TOURNAMENT_QUERY_REPOSITORY);

