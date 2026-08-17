export type MatchMaterializationPlanDTO = {
  roundNumber: number;
  matchNumber: number;
  scheduledAt: Date | null;
  courtId: string | null;
  participants: Array<{ userId: string; teamLabel: string | null }>;
};

export interface TournamentMatchMaterializationRepository {
  /**
   * Transiciona el estado del torneo a `toStatus` y materializa las filas `Match`/
   * `MatchParticipant` a partir de `matches`, de forma atómica (una sola transacción
   * Prisma) e idempotente: si ya existen partidos con `scheduleKey` para el torneo,
   * no crea duplicados (la transición de estado sí se aplica siempre).
   */
  transitionAndMaterializeSV(_input: {
    tournamentId: string;
    toStatus: string;
    scheduleKey: string;
    sportId: string;
    categoryId: string;
    organizerUserId: string;
    matchType: 'AMERICANO' | 'REGULAR';
    matches: MatchMaterializationPlanDTO[];
  }): Promise<{
    created: boolean;
    matchCount: number;
    tournament: { id: string; name: string; status: string };
  }>;
}
