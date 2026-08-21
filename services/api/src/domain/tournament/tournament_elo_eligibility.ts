/** Forma mínima de un `Tournament` requerida para evaluar elegibilidad de Elo. */
export interface TournamentEloEligibilityShape {
  readonly isCompetitive: boolean;
  readonly inscriptionPrice: number | null;
}

/**
 * Determina si un torneo aplica transacciones de Elo a sus participantes autenticados.
 * Solo torneos competitivos Y de pago (`inscriptionPrice > 0`) aplican Elo.
 * Los invitados (GUEST) nunca reciben Elo, sin importar el resultado de esta función:
 * ese filtro ocurre en el sitio de materialización de `MatchParticipant` (userId !== null).
 * Función de dominio pura: no depende de infraestructura ni de `_req`.
 */
export function shouldApplyTournamentEloSV(_t: TournamentEloEligibilityShape): boolean {
  return _t.isCompetitive === true && (_t.inscriptionPrice ?? 0) > 0;
}
