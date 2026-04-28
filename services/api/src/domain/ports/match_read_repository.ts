export type MatchSnapshotDTO = {
  id: string;
  categoryId: string;
  sportId: string;
  status: string;
  maxParticipants: number;
};

export interface MatchReadRepository {
  findByIdSV(_matchId: string): Promise<MatchSnapshotDTO | null>;
}

