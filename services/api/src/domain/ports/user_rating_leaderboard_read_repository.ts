export type UserRatingLeaderboardItemDTO = {
  userId: string;
  rating: number;
  updatedAt: Date;
  displayName: string;
};

export type UserRatingLeaderboardDTO = {
  items: Array<UserRatingLeaderboardItemDTO & { rank: number }>;
};

export interface UserRatingLeaderboardReadRepository {
  listLeaderboardByCategorySV(_params: { categoryId: string; limit: number }): Promise<UserRatingLeaderboardDTO>;
}

