export type ListMatchesFiltersDTO = {
  sportId?: string;
  categoryId?: string;
  status?: 'SCHEDULED' | 'IN_PROGRESS' | 'FINISHED' | 'CANCELLED';
  scheduledFrom?: Date;
  scheduledTo?: Date;
};

export type ListVenueMatchesFiltersDTO = {
  courtId?: string;
  date?: string; // YYYY-MM-DD
  status?: 'SCHEDULED' | 'IN_PROGRESS' | 'FINISHED' | 'CANCELLED';
};

export type PageDTO = {
  page: number;
  limit: number;
};

export type MatchListItemDTO = {
  id: string;
  sportId: string;
  categoryId: string;
  categoryName?: string;
  type: 'AMERICANO' | 'REGULAR';
  status: 'SCHEDULED' | 'IN_PROGRESS' | 'FINISHED' | 'CANCELLED';
  scheduledAt: Date | null;
  pricePerPlayerCents: number;
  maxParticipants: number;
  participantCount: number;
  openSpots: number;
};

export type MatchParticipantDTO = {
  userId: string;
  displayName?: string;
  joinedAt: Date;
};

export type MatchDetailDTO = MatchListItemDTO & {
  courtId: string | null;
  venueId: string | null;
  clubName?: string;
  courtName?: string;
  locationLabel?: string;
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
  listMatchesByVenueSV(
    _venueId: string,
    _filters: ListVenueMatchesFiltersDTO,
    _page: PageDTO,
  ): Promise<{ items: (MatchListItemDTO & { courtId: string | null; courtName: string | null })[]; total: number }>;
}

