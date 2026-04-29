export type UserStatsDTO = {
  userId: string;
  gamesPlayed: number;
  points: number;
};

export interface UserStatsRepository {
  getUserStatsSV(_userId: string): Promise<UserStatsDTO | null>;
}

