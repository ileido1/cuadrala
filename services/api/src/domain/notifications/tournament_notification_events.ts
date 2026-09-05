/**
 * Los cuatro momentos en los que un torneo tiene que hablar.
 *
 * Antes no emitía ninguno: el jugador se anotaba y quedaba `PENDING` sin saberlo,
 * el organizador lo confirmaba en silencio, el cuadro salía en silencio y el
 * torneo arrancaba en silencio. Los dos esperaban al otro.
 *
 * Todos son de audiencia explícita —el organizador, o los inscriptos
 * confirmados—, nunca de audiencia geográfica: a diferencia de una vacante en
 * una partida, acá ya se sabe a quién le importa.
 */
export const TOURNAMENT_NOTIFICATION_EVENT_TYPES = [
  'TOURNAMENT_REGISTRATION_RECEIVED',
  'TOURNAMENT_REGISTRATION_CONFIRMED',
  'TOURNAMENT_SCHEDULE_PUBLISHED',
  'TOURNAMENT_STARTED',
] as const;

export type TournamentNotificationEventType =
  (typeof TOURNAMENT_NOTIFICATION_EVENT_TYPES)[number];

export function isTournamentNotificationEventTypeSV(
  _type: string,
): _type is TournamentNotificationEventType {
  return (TOURNAMENT_NOTIFICATION_EVENT_TYPES as readonly string[]).includes(_type);
}
