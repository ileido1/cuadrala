export type UserStatsDTO = {
  userId: string;
  gamesPlayed: number;
  points: number;
  matchesPlayed: number;
  matchesWon: number;
  matchesLost: number;
  winRate: number;
};

export interface UserStatsRepository {
  getUserStatsSV(_userId: string): Promise<UserStatsDTO | null>;
}

