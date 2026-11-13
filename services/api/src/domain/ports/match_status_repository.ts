import type { MatchAutoCancelReason } from '../match_lifecycle/match_block.js';

/** Partida que este llamado canceló de verdad (el compare-and-swap le tocó a él). */
export type AutoCancelledMatchDTO = {
  matchId: string;
  categoryId: string;
  reason: MatchAutoCancelReason;
  participantUserIds: string[];
};

/** Partida que este llamado terminó de verdad al vencer su bloque. */
export type AutoFinishedMatchDTO = {
  matchId: string;
  categoryId: string;
  participantUserIds: string[];
  hasResultDraft: boolean;
};

export interface MatchStatusRepository {
  //? Reconcilia partidas vencidas: inicia las listas y cancela las incompletas.
  //? `cancelled` lista solo las que este llamado canceló, para avisar una sola vez.
  updateScheduledToInProgressSV(): Promise<{
    updatedCount: number;
    cancelledCount: number;
    cancelled: AutoCancelledMatchDTO[];
  }>;

  //? Termina las partidas regulares en curso cuyo bloque de cancha ya venció.
  //? Devuelve solo las que este llamado terminó (compare-and-swap por partida).
  finishExpiredInProgressSV(_now: Date): Promise<AutoFinishedMatchDTO[]>;

  //? Transición atómica condicionada al estado actual (compare-and-swap).
  //? Devuelve true si la partida coincidía con fromStatus y fue actualizada,
  //? false si no había ninguna partida en ese estado (transición inválida).
  transitionStatusIfCurrentSV(_params: {
    matchId: string;
    fromStatus: string;
    toStatus: string;
  }): Promise<boolean>;
}
