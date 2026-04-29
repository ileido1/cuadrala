import { ApplyEloAfterMatchResultUseCase } from '../../application/use_cases/apply_elo_after_match_result.use_case.js';
import { PrismaMatchResultReadRepository } from '../../infrastructure/adapters/prisma_match_result_read_repository.js';
import { PrismaUserRatingRepository } from '../../infrastructure/adapters/prisma_user_rating_repository.js';

const MATCH_RESULT_READ_REPOSITORY = new PrismaMatchResultReadRepository();
const USER_RATING_REPOSITORY = new PrismaUserRatingRepository();

export const APPLY_ELO_AFTER_MATCH_RESULT_UC = new ApplyEloAfterMatchResultUseCase(
  MATCH_RESULT_READ_REPOSITORY,
  USER_RATING_REPOSITORY,
);

