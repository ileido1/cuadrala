export type TournamentScoreboardRow = {
  userId: string;
  name: string;
  points: number;
  gamesPlayed: number;
};

export interface TournamentScoreboardRepository {
  listScoreboardByTournamentIdSV(_tournamentId: string): Promise<TournamentScoreboardRow[]>;
}

