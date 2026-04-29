export type RankingAggregateRowDTO = {
  userId: string;
  points: number;
  gamesPlayed: number;
};

export interface RankingRepository {
  /**
   * Recalcula el ranking agregado de una categoría desde MatchResult/MatchResultScore.
   * Debe ser idempotente (mismo input => mismas filas) y transaccional.
   */
  recalculateByCategoryIdSV(_categoryId: string): Promise<{
    categoryId: string;
    entriesUpdated: number;
  }>;
}

