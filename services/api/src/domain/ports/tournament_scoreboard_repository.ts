export type TournamentScoreboardRow = {
  userId: string;
  name: string;
  points: number;
  gamesPlayed: number;
  /**
   * Partidos ganados: 1 por partido donde el lado del usuario suma
   * estrictamente más que cualquier otro lado (nunca comparando filas
   * individuales); un empate entre lados no suma a nadie. Ver
   * `domain/tournament/match_side_aggregation.ts`.
   */
  gamesWon: number;
};

export interface TournamentScoreboardRepository {
  listScoreboardByTournamentIdSV(_tournamentId: string): Promise<TournamentScoreboardRow[]>;
}

