import { describe, expect, it } from 'vitest';

import {
  DIRECT_NOTIFICATION_EVENT_TYPES,
  notificationContentForTypeSV,
} from '../../domain/notifications/notification_content.js';
import { TOURNAMENT_NOTIFICATION_EVENT_TYPES } from '../../domain/notifications/tournament_notification_events.js';

describe('Tournament notification events', () => {
  it('should cover every moment a tournament has to announce', () => {
    expect([...TOURNAMENT_NOTIFICATION_EVENT_TYPES]).toEqual([
      'TOURNAMENT_REGISTRATION_RECEIVED',
      'TOURNAMENT_REGISTRATION_CONFIRMED',
      'TOURNAMENT_SCHEDULE_PUBLISHED',
      'TOURNAMENT_STARTED',
      //? Un rechazo y un vencimiento comparten evento: para el organizador son
      //? el mismo problema, "este partido necesita que lo mires".
      'TOURNAMENT_MATCH_NEEDS_ATTENTION',
      'TOURNAMENT_MATCH_RESULT_RECORDED',
    ]);
  });

  //? El despachador resuelve contexto de partido para los eventos que NO son
  //? directos. Un evento de torneo no tiene `matchId`, así que si se le
  //? escapara a ese conjunto el despachador lo daría por procesado sin enviarlo.
  it('should be dispatched directly, never through the geo audience', () => {
    for (const TYPE of TOURNAMENT_NOTIFICATION_EVENT_TYPES) {
      expect(DIRECT_NOTIFICATION_EVENT_TYPES.has(TYPE)).toBe(true);
    }
  });

  it('should have its own copy, not the generic fallback', () => {
    const FALLBACK = notificationContentForTypeSV('LO_QUE_SEA');

    for (const TYPE of TOURNAMENT_NOTIFICATION_EVENT_TYPES) {
      const CONTENT = notificationContentForTypeSV(TYPE);
      expect(CONTENT.title).not.toBe(FALLBACK.title);
      expect(CONTENT.body).not.toBe(FALLBACK.body);
    }
  });

  it('should tell the player the schedule is out, not that "something happened"', () => {
    expect(notificationContentForTypeSV('TOURNAMENT_SCHEDULE_PUBLISHED').title).toBe(
      'Ya está el calendario',
    );
  });

  //? Copia exacta del handoff (`cuadrala-torneo-org.jsx:342`): nada inventado.
  it('should use the exact handoff copy "Resultado cargado" for both title and body', () => {
    const CONTENT = notificationContentForTypeSV('TOURNAMENT_MATCH_RESULT_RECORDED');
    expect(CONTENT.title).toBe('Resultado cargado');
    expect(CONTENT.body).toBe('Resultado cargado');
  });
});
