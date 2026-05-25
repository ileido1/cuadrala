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
    default:
      return { title: 'Notificación', body: 'Tienes una nueva notificación.' };
  }
}

/** Eventos con deliveries creados explícitamente (no audiencia geo). */
export const DIRECT_NOTIFICATION_EVENT_TYPES = new Set([
  'CHAT_MESSAGE',
  'PAYMENT_PENDING',
  'MATCH_CANCELLED',
  'MATCH_PLAYER_JOINED',
  'PAYMENT_CONFIRMED',
]);
