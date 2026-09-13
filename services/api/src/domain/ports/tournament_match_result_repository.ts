export interface TournamentMatchResultRepository {
  getVenueIdForTournamentSV(_tournamentId: string): Promise<string | null>;
  matchBelongsToTournamentSV(_matchId: string, _tournamentId: string): Promise<boolean>;
  /** `true` cuando el partido ya tiene un `MatchResult` registrado (evita duplicados). */
  matchHasResultSV(_matchId: string): Promise<boolean>;
  registerResultSV(_input: {
    matchId: string;
    scores: Array<{ userId: string; points: number }>;
  }): Promise<{ resultId: string; recordedAt: Date }>;
}
