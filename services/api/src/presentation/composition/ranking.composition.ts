import { RecalculateRankingUseCase } from '../../application/use_cases/recalculate_ranking.use_case.js';
import { PrismaCategoryRepository } from '../../infrastructure/adapters/prisma_category_repository.js';
import { PrismaRankingRepository } from '../../infrastructure/adapters/prisma_ranking_repository.js';
import { RANKING_OBSERVABILITY } from '../observability/ranking_observability.js';

const CATEGORY_REPOSITORY = new PrismaCategoryRepository();
const RANKING_REPOSITORY = new PrismaRankingRepository();

export const RECALCULATE_RANKING_UC = new RecalculateRankingUseCase(
  CATEGORY_REPOSITORY,
  RANKING_REPOSITORY,
  RANKING_OBSERVABILITY,
);

