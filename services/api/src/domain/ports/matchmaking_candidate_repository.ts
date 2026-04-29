export type MatchmakingEloCandidateDTO = {
  userId: string;
  name: string;
  rating: number;
};

export type MatchmakingRankingCandidateDTO = {
  userId: string;
  name: string;
  points: number;
};

export type MatchmakingDirectoryCandidateDTO = {
  userId: string;
  name: string;
};

export interface MatchmakingCandidateRepository {
  listEloCandidatesSV(_dto: {
    categoryId: string;
    excludeUserIds: string[];
    limit: number;
  }): Promise<MatchmakingEloCandidateDTO[]>;

  listRankingCandidatesSV(_dto: {
    categoryId: string;
    excludeUserIds: string[];
    limit: number;
  }): Promise<MatchmakingRankingCandidateDTO[]>;

  listDirectoryCandidatesSV(_dto: {
    categoryId: string;
    excludeUserIds: string[];
    limit: number;
  }): Promise<MatchmakingDirectoryCandidateDTO[]>;

  getCategoryAverageEloSV(_categoryId: string): Promise<number | null>;
  getCategoryAveragePointsSV(_categoryId: string): Promise<number | null>;
}

