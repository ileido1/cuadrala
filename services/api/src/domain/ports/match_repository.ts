export type MatchListFiltersDTO = {
  sportId: string;
  categoryId?: string;
  status?: 'SCHEDULED';
  scheduledFrom?: Date;
  scheduledTo?: Date;
  minPricePerPlayerCents?: number;
  maxPricePerPlayerCents?: number;
  nearLat?: number;
  nearLng?: number;
  radiusKm?: number;
};

export type PageDTO = {
  page: number;
  limit: number;
};

export type OpenMatchDTO = {
  id: string;
  sportId: string;
  categoryId: string;
  categoryName?: string;
  status: string;
  scheduledAt: Date | null;
  pricePerPlayerCents: number;
  maxParticipants: number;
  participantCount: number;
  openSpots: number;
  clubName?: string;
  courtName?: string;
  locationLabel?: string;
  pricingCurrency?: string;
  displayCurrency?: string;
};

export interface MatchRepository {
  listOpenMatchesSV(
    _filters: MatchListFiltersDTO,
    _page: PageDTO,
  ): Promise<{ items: OpenMatchDTO[]; total: number }>;
}

