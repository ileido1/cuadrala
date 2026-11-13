import { describe, expect, it } from 'vitest';

import { notificationContentForTypeSV } from '../../domain/notifications/notification_content.js';

//? Partida rápida usa un solo tipo de evento: el payload decide qué dice la notificación.
describe('Quick match notification content', () => {
  it('should invite the player when the payload is an availability invitation', () => {
    expect(notificationContentForTypeSV('QUICK_MATCH_PROPOSAL', { kind: 'INVITATION' }).title).toBe('Hay un grupo armándose a tu horario, ¿te sumás?');
  });

  it('should say how many players the lobby has when someone joins it', () => {
    expect(notificationContentForTypeSV('QUICK_MATCH_PROPOSAL', { kind: 'LOBBY_JOINED', memberCount: 3 }).title).toBe('Se sumó un jugador (3 de 4)');
  });

  it('should keep the match-found text for the ready check and for events without a kind', () => {
    expect(notificationContentForTypeSV('QUICK_MATCH_PROPOSAL', { kind: 'READY_CHECK' }).title).toBe('Encontramos una partida');
    expect(notificationContentForTypeSV('QUICK_MATCH_PROPOSAL', { proposalType: 'NEW_GROUP' }).title).toBe('Encontramos una partida');
    expect(notificationContentForTypeSV('QUICK_MATCH_PROPOSAL').title).toBe('Encontramos una partida');
  });
});
