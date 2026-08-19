export type MatchMaterializationPlanDTO = {
  roundNumber: number;
  matchNumber: number;
  scheduledAt: Date | null;
  courtId: string | null;
  /**
   * `userId` es nulo para participantes GUEST (Slice 1: tournament-guest-registration).
   * `tournamentRegistrationId` siempre identifica la inscripción de origen (AUTHENTICATED o GUEST).
   */
  participants: Array<{ userId: string | null; tournamentRegistrationId: string; teamLabel: string | null }>;
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
