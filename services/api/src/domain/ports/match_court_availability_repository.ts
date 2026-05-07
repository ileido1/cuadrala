export type PublishedVacantSlotInfoDTO = {
  sportId: string;
  categoryId: string;
};

export type CourtSummaryDTO = {
  id: string;
  venueId: string;
  name: string;
};

export interface MatchCourtAvailabilityRepository {
  listVenueCourtsSV(_venueId: string): Promise<CourtSummaryDTO[]>;

  getCourtVenueIdSV(_courtId: string): Promise<string | null>;

  findPublishedVacantAtCourtScheduledAtSV(
    _courtId: string,
    _scheduledAt: Date,
  ): Promise<PublishedVacantSlotInfoDTO | null>;

  findConflictingActiveMatchIdSV(_params: {
    courtId: string;
    scheduledAt: Date;
    durationMinutes: number;
    excludeMatchId?: string;
  }): Promise<string | null>;
}
