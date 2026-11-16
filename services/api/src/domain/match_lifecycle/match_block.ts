import { DEFAULT_VENUE_TIMEZONE, venueWallClockNowSV } from '../services/venue/venue_opening_hours.service.js';

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

/**
 * @name    :wallClockNowSV
 * @description :Hora actual de la sede con la convención del sistema: los
 *   `scheduledAt` guardan la hora de pared con componentes UTC (19:00 en
 *   Caracas se guarda 19:00Z). Para saber si un bloque ya empezó hay que
 *   comparar contra esta hora, no contra el reloj real (que va 4h adelante).
 * @param {Date} _at - Instante real
 * @returns {Date}
 */
// ponytail: zona por defecto para todas las sedes (hoy todas en Venezuela); usar la timezone de cada sede si se abren en otra zona.
export function wallClockNowSV(_at: Date): Date {
  return venueWallClockNowSV(_at, DEFAULT_VENUE_TIMEZONE);
}
