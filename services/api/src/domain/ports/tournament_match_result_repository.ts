export type TournamentMatchStateSideSV = {
  /** `teamLabel` cuando existe; si no, el propio `userId`, o la inscripción del invitado. */
  sideKey: string;
  userIds: Array<string | null>;
  registrationIds: string[];
};

export type TournamentMatchStateScoreSV = {
  userId: string | null;
  tournamentRegistrationId: string | null;
  points: number;
};

export type TournamentMatchStateSV = {
  roundNumber: number;
  matchNumber: number;
  matchId: string;
  matchStatus: string;
  sides: TournamentMatchStateSideSV[];
  scores: TournamentMatchStateScoreSV[];
};

export type MatchParticipantSideLookupSV = {
  userId: string | null;
  tournamentRegistrationId: string | null;
  teamLabel: string | null;
};

export interface TournamentMatchResultRepository {
  getVenueIdForTournamentSV(_tournamentId: string): Promise<string | null>;
  matchBelongsToTournamentSV(_matchId: string, _tournamentId: string): Promise<boolean>;
  /** `true` cuando el partido ya tiene un `MatchResult` registrado (evita duplicados). */
  matchHasResultSV(_matchId: string): Promise<boolean>;
  /**
   * Registra el resultado de un partido y, si pertenece a un torneo de
   * eliminación simple, avanza el cuadro en la misma transacción (D13/S7c-1):
   * crea o llena el/los partidos de la siguiente ronda (incluido el de 3er
   * puesto) que ya tengan ambos lados resueltos, sin duplicar bajo
   * concurrencia (dos semifinales resueltas a la vez crean una sola final) ni
   * al reintentar (`createdMatchIds` sale vacío en un reintento idempotente).
   * Round robin/americano no avanzan: `createdMatchIds` siempre vacío.
   */
  registerResultAndAdvanceSV(_input: {
    matchId: string;
    scores: Array<{ userId?: string; tournamentRegistrationId?: string; points: number }>;
  }): Promise<{ resultId: string; recordedAt: Date; createdMatchIds: string[] }>;
  /**
   * `userId` + `MatchParticipant.teamLabel` de cada participante de un partido,
   * para agrupar los `scores` por lado (`aggregateMatchSideTotalsSV`) antes de
   * determinar ganador/empate. Nunca compara filas individuales de puntaje.
   */
  listMatchParticipantSidesSV(_matchId: string): Promise<MatchParticipantSideLookupSV[]>;
  /**
   * Estado materializado (partido, lados, resultado) de cada `Match` ya
   * creado para un `scheduleKey`, en **una sola consulta** — nunca N+1 por
   * slot del calendario. Los slots del cuadro sin `Match` materializado
   * simplemente no aparecen en el arreglo devuelto.
   */
  listTournamentMatchStatesSV(_input: {
    tournamentId: string;
    scheduleKey: string;
  }): Promise<TournamentMatchStateSV[]>;
}
