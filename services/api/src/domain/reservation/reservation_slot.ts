/**
 * Estados en los que una reserva ocupa la cancha.
 *
 * Son los mismos que cubre el indice parcial `Reservation_court_slot_live_uniq`.
 * Si las dos listas se separan, la base y la aplicacion dejan de coincidir sobre
 * que significa "esta cancha esta tomada".
 */
export const LIVE_RESERVATION_STATUSES: ReadonlySet<string> = new Set(['HELD', 'CONFIRMED']);

/** `true` si una reserva en `_status` bloquea la cancha. */
export function occupiesSlotSV(_status: string): boolean {
  return LIVE_RESERVATION_STATUSES.has(_status);
}

/**
 * Cuanto vive un turno apartado antes de soltarse solo.
 *
 * El torneo aparta las canchas al generar el cuadro y las suelta si los
 * jugadores no aceptan su horario. Sin vencimiento, un jugador que nunca
 * contesta le bloquea a la sede una cancha vendible para siempre.
 */
export const DEFAULT_HOLD_TTL_HOURS = 48;

export function holdExpiresAtSV(_now: Date, _ttlHours: number = DEFAULT_HOLD_TTL_HOURS): Date {
  return new Date(_now.getTime() + _ttlHours * 60 * 60 * 1000);
}

/** `true` si un turno apartado ya vencio y hay que liberarlo. */
export function isHoldExpiredSV(
  _reservation: { status: string; holdExpiresAt: Date | null },
  _now: Date,
): boolean {
  if (_reservation.status !== 'HELD') return false;
  //? Un HELD sin vencimiento seria un turno bloqueado para siempre; se trata
  //? como vencido para que el barrido lo suelte en vez de dejarlo colgado.
  if (_reservation.holdExpiresAt === null) return true;
  return _reservation.holdExpiresAt.getTime() <= _now.getTime();
}
