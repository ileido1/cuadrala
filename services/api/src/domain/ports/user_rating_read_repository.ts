export type UserRatingReadRowDTO = {
  categoryId: string;
  rating: number;
  updatedAt: Date;
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
  getUserRatingHistorySV(_params: {
    userId: string;
    categoryId?: string;
    page: number;
    limit: number;
  }): Promise<PaginatedUserRatingHistoryDTO | null>;
}

