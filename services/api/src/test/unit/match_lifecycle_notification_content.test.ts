import { describe, expect, it } from 'vitest';

import {
  DIRECT_NOTIFICATION_EVENT_TYPES,
  notificationContentForTypeSV,
} from '../../domain/notifications/notification_content.js';

describe('notificationContentForTypeSV — ciclo de vida por bloque', () => {
  it('should ask to load the result when the type is MATCH_RESULT_REMINDER', () => {
    expect(notificationContentForTypeSV('MATCH_RESULT_REMINDER', { matchId: 'm1' })).toEqual({
      title: '¿Cómo salió la partida?',
      body: 'Cargá el resultado para que todos lo confirmen.',
    });
  });

  it('should say the match was incomplete when the cancel reason is INCOMPLETE', () => {
    expect(notificationContentForTypeSV('MATCH_CANCELLED', { reason: 'INCOMPLETE' })).toEqual({
      title: 'Partida cancelada',
      body: 'La partida se canceló porque no se completó a la hora de empezar.',
    });
  });

  it('should say payments were missing when the cancel reason is UNPAID', () => {
    expect(notificationContentForTypeSV('MATCH_CANCELLED', { reason: 'UNPAID' })).toEqual({
      title: 'Partida cancelada',
      body: 'La partida se canceló porque faltaban pagos confirmados a la hora de empezar.',
    });
  });

  it('should keep the generic cancel text when the payload has no reason', () => {
    expect(
      notificationContentForTypeSV('MATCH_CANCELLED', { kind: 'MATCH_CANCELLED', cancelledByUserId: 'u1' }),
    ).toEqual({ title: 'Partida cancelada', body: 'Una partida fue cancelada.' });
    expect(notificationContentForTypeSV('MATCH_CANCELLED')).toEqual({
      title: 'Partida cancelada',
      body: 'Una partida fue cancelada.',
    });
  });

  it('should keep other match texts unchanged', () => {
    expect(notificationContentForTypeSV('MATCH_PLAYER_JOINED')).toEqual({
      title: 'Nuevo jugador',
      body: 'Alguien se unió a tu partida.',
    });
    expect(notificationContentForTypeSV('CHAT_MESSAGE')).toEqual({
      title: 'Nuevo mensaje',
      body: 'Tienes un nuevo mensaje en el chat de la partida.',
    });
  });

  it('should treat MATCH_RESULT_REMINDER as a direct event when dispatching', () => {
    expect(DIRECT_NOTIFICATION_EVENT_TYPES.has('MATCH_RESULT_REMINDER')).toBe(true);
  });
});
