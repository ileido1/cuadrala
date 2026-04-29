export type MatchResultScoreDTO = {
  userId: string;
  points: number;
};

export type MatchResultWithMatchDTO = {
  resultId: string;
  matchId: string;
  categoryId: string;
  scores: MatchResultScoreDTO[];
};

export interface MatchResultReadRepository {
  findByIdWithMatchSV(_resultId: string): Promise<MatchResultWithMatchDTO | null>;
}

