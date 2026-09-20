export interface MatchStatusRepository {
  //? Reconcilia partidas vencidas: inicia las listas y cancela las incompletas.
  updateScheduledToInProgressSV(): Promise<{ updatedCount: number; cancelledCount: number }>;

  //? Transición atómica condicionada al estado actual (compare-and-swap).
  //? Devuelve true si la partida coincidía con fromStatus y fue actualizada,
  //? false si no había ninguna partida en ese estado (transición inválida).
  transitionStatusIfCurrentSV(_params: {
    matchId: string;
    fromStatus: string;
    toStatus: string;
  }): Promise<boolean>;
}
