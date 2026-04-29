export type ChatThreadDTO = {
  id: string;
  matchId: string | null;
  tournamentId: string | null;
  createdAt: Date;
};

export interface ChatThreadRepository {
  findByMatchIdSV(_matchId: string): Promise<ChatThreadDTO | null>;
  findByTournamentIdSV(_tournamentId: string): Promise<ChatThreadDTO | null>;

  getOrCreateForMatchSV(_matchId: string): Promise<ChatThreadDTO>;
  getOrCreateForTournamentSV(_tournamentId: string): Promise<ChatThreadDTO>;
}

