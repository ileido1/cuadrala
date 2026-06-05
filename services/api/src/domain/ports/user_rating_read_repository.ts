export type UserRatingReadRowDTO = {
  categoryId: string;
  rating: number;
  updatedAt: Date;
};

/**
 * Rating "principal" del jugador para resúmenes (p. ej. chip de nivel en Home):
 * la categoría con mayor ELO, enriquecida con nombre de categoría y deporte.
 */
export type PrimaryUserRatingDTO = {
  categoryId: string;
  categoryName: string;
  sportId: string;
  rating: number;
};

export type UserRatingHistoryReadRowDTO = {
  matchId: string;
  resultId: string;
  previousRating: number;
  newRating: number;
  kFactor: number;
  createdAt: Date;
};

export type PaginatedUserRatingHistoryDTO = {
  items: UserRatingHistoryReadRowDTO[];
  pageInfo: {
    page: number;
    limit: number;
    total: number;
  };
};

export interface UserRatingReadRepository {
  getUserRatingsSV(_userId: string, _categoryId?: string): Promise<UserRatingReadRowDTO[] | null>;
  /**
   * Devuelve el rating de mayor ELO del usuario con datos de categoría/deporte,
   * o `null` si el usuario no tiene ratings registrados.
   */
  getPrimaryUserRatingSV(_userId: string): Promise<PrimaryUserRatingDTO | null>;
  getUserRatingHistorySV(_params: {
    userId: string;
    categoryId?: string;
    page: number;
    limit: number;
  }): Promise<PaginatedUserRatingHistoryDTO | null>;
}

