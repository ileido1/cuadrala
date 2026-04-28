export type ListMatchesFiltersDTO = {
  sportId?: string;
  categoryId?: string;
  status?: 'SCHEDULED' | 'IN_PROGRESS' | 'FINISHED' | 'CANCELLED';
  scheduledFrom?: Date;
  scheduledTo?: Date;
};

export type PageDTO = {
  page: number;
  limit: number;
};

export type MatchListItemDTO = {
  id: string;
  sportId: string;
  categoryId: string;
  type: 'AMERICANO' | 'REGULAR';
  status: 'SCHEDULED' | 'IN_PROGRESS' | 'FINISHED' | 'CANCELLED';
  scheduledAt: Date | null;
  maxParticipants: number;
  participantCount: number;
  openSpots: number;
};

export type MatchParticipantDTO = {
  userId: string;
  joinedAt: Date;
};

export type MatchDetailDTO = MatchListItemDTO & {
  courtId: string | null;
  tournamentId: string | null;
  participants: MatchParticipantDTO[];
  createdAt: Date;
  updatedAt: Date;
};

export interface MatchQueryRepository {
  listMatchesSV(
    _filters: ListMatchesFiltersDTO,
    _page: PageDTO,
  ): Promise<{ items: MatchListItemDTO[]; total: number }>;
  getMatchByIdSV(_matchId: string): Promise<MatchDetailDTO | null>;
}

