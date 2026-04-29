export type RankingRecalculationSummaryDTO = {
  categoryId: string;
  updatedCount: number;
  elapsedMs: number;
};

export interface RankingObservability {
  onRecalculationCompletedSV(_summary: RankingRecalculationSummaryDTO): void;
}

export class NoopRankingObservability implements RankingObservability {
  onRecalculationCompletedSV(): void {}
}

