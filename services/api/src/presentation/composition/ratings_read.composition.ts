import { GetUserRatingHistoryUseCase } from '../../application/use_cases/get_user_rating_history.use_case.js';
import { GetUserRatingsUseCase } from '../../application/use_cases/get_user_ratings.use_case.js';
import { PrismaUserRatingReadRepository } from '../../infrastructure/adapters/prisma_user_rating_read_repository.js';

const USER_RATING_READ_REPOSITORY = new PrismaUserRatingReadRepository();

export const GET_USER_RATINGS_UC = new GetUserRatingsUseCase(USER_RATING_READ_REPOSITORY);
export const GET_USER_RATING_HISTORY_UC = new GetUserRatingHistoryUseCase(USER_RATING_READ_REPOSITORY);

