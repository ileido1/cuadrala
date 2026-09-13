export type TournamentMatchStateSideSV = {
  /** `teamLabel` cuando existe; si no, el propio `userId`, o la inscripción del huésped. */
  sideKey: string;
  userIds: Array<string | null>;
};

export type TournamentMatchStateScoreSV = {
  userId: string;
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
  teamLabel: string | null;
};

export interface TournamentMatchResultRepository {
  getVenueIdForTournamentSV(_tournamentId: string): Promise<string | null>;
  matchBelongsToTournamentSV(_matchId: string, _tournamentId: string): Promise<boolean>;
  /** `true` cuando el partido ya tiene un `MatchResult` registrado (evita duplicados). */
  matchHasResultSV(_matchId: string): Promise<boolean>;
  registerResultSV(_input: {
    matchId: string;
    scores: Array<{ userId: string; points: number }>;
  }): Promise<{ resultId: string; recordedAt: Date }>;
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
