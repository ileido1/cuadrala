export type TournamentScoreboardRow = {
  userId: string | null;
  tournamentRegistrationId?: string;
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
  gamesLost: number;
  /** Historical persisted tied results; new result submission rejects ties. */
  gamesDrawn: number;
  pointsFor: number;
  pointsAgainst: number;
  difference: number;
  /** Internal ranking input; stripped before the HTTP DTO is returned. */
  headToHeadWins: Record<string, number>;
};

export interface TournamentScoreboardRepository {
  listScoreboardByTournamentIdSV(_tournamentId: string): Promise<TournamentScoreboardRow[]>;
}
