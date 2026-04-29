import type {
  RankingObservability,
  RankingRecalculationSummaryDTO,
} from '../../domain/ports/ranking_observability.js';

function safeJsonLogSV(_obj: Record<string, unknown>): void {
  // Logging estructurado: un JSON por línea.
  console.log(JSON.stringify(_obj));
}

export class RankingObservabilityAdapter implements RankingObservability {
  onRecalculationCompletedSV(_summary: RankingRecalculationSummaryDTO): void {
    safeJsonLogSV({
      kind: 'ranking.recalculate',
      status: 'COMPLETED',
      categoryId: _summary.categoryId,
      updatedCount: _summary.updatedCount,
      elapsedMs: _summary.elapsedMs,
    });
  }
}

export const RANKING_OBSERVABILITY = new RankingObservabilityAdapter();

