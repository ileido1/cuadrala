export type TournamentScheduleDTO = {
  id: string;
  tournamentId: string;
  formatCode: string;
  scheduleKey: string;
  payload: unknown;
  /// Horario y cancha por partido, o `null` si el cuadro nunca se pudo planificar.
  slotPlan: Array<{
    roundNumber: number;
    matchNumber: number;
    courtId: string;
    scheduledAt: Date;
  }> | null;
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

  /**
   * Guarda el horario y la cancha de cada partido del cuadro.
   *
   * Va aparte de `payload` porque ese es el cuadro (quien contra quien) y esto
   * es donde y cuando, que depende de la sede.
   */
  saveSlotPlanSV(_input: {
    tournamentId: string;
    slotPlan: Array<{
      roundNumber: number;
      matchNumber: number;
      courtId: string;
      scheduledAt: Date;
    }>;
  }): Promise<void>;
}

