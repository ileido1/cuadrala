export type TournamentScheduleDTO = {
  id: string;
  tournamentId: string;
  formatCode: string;
  scheduleKey: string;
  payload: unknown;
  createdAt: Date;
  updatedAt: Date;
};

export interface TournamentScheduleRepository {
  findByTournamentIdSV(_tournamentId: string): Promise<TournamentScheduleDTO | null>;

  /**
   * Crea el schedule si no existe. Si existe, valida idempotencia por scheduleKey.
   */
  createOrValidateIdempotencySV(_input: {
    tournamentId: string;
    formatCode: string;
    scheduleKey: string;
    payload: unknown;
  }): Promise<{ created: boolean; schedule: TournamentScheduleDTO }>;
}

