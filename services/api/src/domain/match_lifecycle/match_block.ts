/**
 * Duración del bloque de una partida sin reserva asociada. Las partidas con
 * reserva usan `Reservation.durationMinutes`.
 */
export const DEFAULT_MATCH_BLOCK_MINUTES = 90;

/** Por qué el worker cancela una partida al llegar su hora (va en `payload.reason`). */
export type MatchAutoCancelReason = 'INCOMPLETE' | 'UNPAID';

/**
 * @name    :matchBlockEndsAtSV
 * @description :Momento en que termina el bloque de cancha de una partida.
 * @param {Date} _scheduledAt - Inicio del bloque
 * @param {number | null} _durationMinutes - Duración de la reserva, o null si no hay reserva
 * @returns {Date}
 */
export function matchBlockEndsAtSV(_scheduledAt: Date, _durationMinutes: number | null): Date {
  const MINUTES = _durationMinutes ?? DEFAULT_MATCH_BLOCK_MINUTES;
  return new Date(_scheduledAt.getTime() + MINUTES * 60_000);
}
