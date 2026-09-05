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

  /**
   * Turnos vivos (HELD o CONFIRMED) de una sede dentro de una ventana.
   *
   * Lectura en bloque para planificar el calendario de un torneo: preguntar
   * cancha por cancha y horario por horario serian cientos de consultas.
   */
  listLiveReservationSlotsSV(_params: {
    venueId: string;
    from: Date;
    to: Date;
  }): Promise<Array<{ courtId: string; scheduledAt: Date }>>;

  hasConfirmedReservationAtCourtScheduledAtSV(
    _courtId: string,
    _scheduledAt: Date,
  ): Promise<boolean>;
}
