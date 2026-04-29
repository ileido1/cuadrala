import { GetEloLeaderboardUseCase } from '../../application/use_cases/get_elo_leaderboard.use_case.js';
import { PrismaUserRatingLeaderboardReadRepository } from '../../infrastructure/adapters/prisma_user_rating_leaderboard_read_repository.js';

const LEADERBOARD_REPOSITORY = new PrismaUserRatingLeaderboardReadRepository();

export const GET_ELO_LEADERBOARD_UC = new GetEloLeaderboardUseCase(LEADERBOARD_REPOSITORY);

