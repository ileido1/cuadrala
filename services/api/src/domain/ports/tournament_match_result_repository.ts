export interface TournamentMatchResultRepository {
  getVenueIdForTournamentSV(_tournamentId: string): Promise<string | null>;
  matchBelongsToTournamentSV(_matchId: string, _tournamentId: string): Promise<boolean>;
  registerResultSV(_input: {
    matchId: string;
    scores: Array<{ userId: string; points: number }>;
  }): Promise<{ resultId: string; recordedAt: Date }>;
}
