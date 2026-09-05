import { TOURNAMENT_NOTIFICATION_EVENT_TYPES } from './tournament_notification_events.js';

/** Títulos y cuerpos de notificaciones in-app / push por tipo de evento. */
export function notificationContentForTypeSV(
  _type: string,
): { title: string; body: string } {
  switch (_type) {
    case 'MATCH_SLOT_OPENED':
      return {
        title: 'Se abrió una vacante',
        body:
          'Hay una vacante disponible en una partida que coincide con tus preferencias.',
      };
    case 'MATCH_CANCELLED':
      return { title: 'Partida cancelada', body: 'Una partida fue cancelada.' };
    case 'CHAT_MESSAGE':
      return {
        title: 'Nuevo mensaje',
        body: 'Tienes un nuevo mensaje en el chat de la partida.',
      };
    case 'PAYMENT_PENDING':
      return {
        title: 'Pago pendiente',
        body: 'Hay un pago pendiente de revisión en tu partida.',
      };
    case 'MATCH_PLAYER_JOINED':
      return {
        title: 'Nuevo jugador',
        body: 'Alguien se unió a tu partida.',
      };
    case 'PAYMENT_CONFIRMED':
      return {
        title: 'Pago confirmado',
        body: 'Tu pago fue confirmado por el club.',
      };
    case 'TOURNAMENT_REGISTRATION_RECEIVED':
      return {
        title: 'Nueva inscripción',
        body: 'Alguien se anotó a tu torneo y espera tu confirmación.',
      };
    case 'TOURNAMENT_REGISTRATION_CONFIRMED':
      return {
        title: 'Estás dentro',
        body: 'El organizador confirmó tu inscripción al torneo.',
      };
    case 'TOURNAMENT_SCHEDULE_PUBLISHED':
      return {
        title: 'Ya está el calendario',
        body: 'Se publicó el calendario del torneo. Mirá cuándo te toca jugar.',
      };
    case 'TOURNAMENT_STARTED':
      return {
        title: 'Arrancó el torneo',
        body: 'Tu torneo comenzó. Seguí los resultados y la tabla desde la app.',
      };
    default:
      return { title: 'Notificación', body: 'Tienes una nueva notificación.' };
  }
}

/** Eventos con deliveries creados explícitamente (no audiencia geo). */
export const DIRECT_NOTIFICATION_EVENT_TYPES = new Set<string>([
  'CHAT_MESSAGE',
  'PAYMENT_PENDING',
  'MATCH_CANCELLED',
  'MATCH_PLAYER_JOINED',
  'PAYMENT_CONFIRMED',
  //? Los de torneo no tienen `matchId`: si salieran de este conjunto, el
  //? despachador buscaría contexto de partido, no lo encontraría y los daría
  //? por procesados sin enviar nada.
  ...TOURNAMENT_NOTIFICATION_EVENT_TYPES,
]);
