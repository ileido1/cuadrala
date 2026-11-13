export type MatchSnapshotDTO = {
  id: string;
  categoryId: string;
  sportId: string;
  status: string;
  maxParticipants: number;
  affectsElo: boolean;
  /** Null en partidas regulares (abiertas / rápidas). */
  tournamentId: string | null;
};

export interface MatchReadRepository {
  findByIdSV(_matchId: string): Promise<MatchSnapshotDTO | null>;
}
