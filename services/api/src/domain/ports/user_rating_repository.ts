export type UserRatingDTO = {
  userId: string;
  categoryId: string;
  rating: number;
};

export type UserRatingHistoryDTO = {
  userId: string;
  categoryId: string;
  matchId: string;
  resultId: string;
  previousRating: number;
  newRating: number;
  kFactor: number;
};

export interface UserRatingRepository {
  getRatingsByUserIdsSV(_categoryId: string, _userIds: string[]): Promise<UserRatingDTO[]>;
  upsertRatingsSV(_ratings: UserRatingDTO[]): Promise<void>;
  appendHistorySV(_rows: UserRatingHistoryDTO[]): Promise<void>;
  countHistoryByUserIdsSV(_categoryId: string, _userIds: string[]): Promise<Record<string, number>>;
}

