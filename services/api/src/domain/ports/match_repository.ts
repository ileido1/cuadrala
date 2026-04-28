export type MatchListFiltersDTO = {
  sportId: string;
  categoryId?: string;
  status?: 'SCHEDULED';
  scheduledFrom?: Date;
  scheduledTo?: Date;
};

export type PageDTO = {
  page: number;
  limit: number;
};

export type OpenMatchDTO = {
  id: string;
  sportId: string;
  categoryId: string;
  status: string;
  scheduledAt: Date | null;
  maxParticipants: number;
  participantCount: number;
  openSpots: number;
};

export interface MatchRepository {
  listOpenMatchesSV(
    _filters: MatchListFiltersDTO,
    _page: PageDTO,
  ): Promise<{ items: OpenMatchDTO[]; total: number }>;
}

