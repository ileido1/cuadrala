/**
 * Estados en los que el plantel de un torneo todavía puede cambiar.
 *
 * `DRAFT` es el torneo sin publicar y `OPEN` el publicado: en ambos se admite
 * gente. La ventana se cierra al pasar a `IN_PROGRESS`, cuando el cuadro ya
 * está materializado y sumar un jugador lo invalidaría.
 *
 * Vive acá porque cuatro casos de uso deciden lo mismo —autoinscripción, baja,
 * invitación a un usuario e invitación a un huésped— y cuando cada uno tenía su
 * propia copia se desincronizaron: la autoinscripción se quedó exigiendo
 * `DRAFT` a secas mientras las otras tres ya aceptaban `OPEN`. El resultado era
 * que en el estado llamado "abierto" el organizador podía invitar pero el
 * jugador no podía anotarse.
 */
export const TOURNAMENT_ROSTER_OPEN_STATUSES: ReadonlySet<string> = new Set(['DRAFT', 'OPEN']);

/** `true` si el torneo admite altas y bajas de participantes en `_status`. */
export function isTournamentRosterOpenSV(_status: string): boolean {
  return TOURNAMENT_ROSTER_OPEN_STATUSES.has(_status);
}
