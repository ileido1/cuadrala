import { AppError } from '../../domain/errors/app_error.js';
import type { CategoryRepository } from '../../domain/ports/category_repository.js';
import type {
  RankingObservability,
  RankingRecalculationSummaryDTO,
} from '../../domain/ports/ranking_observability.js';
import { NoopRankingObservability } from '../../domain/ports/ranking_observability.js';
import type { RankingRepository } from '../../domain/ports/ranking_repository.js';

export class RecalculateRankingUseCase {
  constructor(
    private readonly _categoryRepository: CategoryRepository,
    private readonly _rankingRepository: RankingRepository,
    private readonly _observability: RankingObservability = new NoopRankingObservability(),
  ) {}

  async executeSV(_categoryId: string): Promise<{
    categoryId: string;
    entriesUpdated: number;
  }> {
    const CATEGORY = await this._categoryRepository.findByIdSV(_categoryId);
    if (CATEGORY === null) {
      throw new AppError('CATEGORIA_NO_ENCONTRADA', 'La categoría indicada no existe.', 404);
    }

    const STARTED_AT = Date.now();
    const RES = await this._rankingRepository.recalculateByCategoryIdSV(_categoryId);
    const ELAPSED_MS = Date.now() - STARTED_AT;

    const SUMMARY: RankingRecalculationSummaryDTO = {
      categoryId: _categoryId,
      updatedCount: RES.entriesUpdated,
      elapsedMs: ELAPSED_MS,
    };
    this._observability.onRecalculationCompletedSV(SUMMARY);

    return RES;
  }
}

