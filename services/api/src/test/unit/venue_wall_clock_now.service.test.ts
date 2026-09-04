import { describe, expect, it } from 'vitest';

import { venueWallClockNowSV } from '../../domain/services/venue/venue_opening_hours.service.js';

describe('venueWallClockNowSV', () => {
  //? La convención wall-clock-as-UTC: los componentes UTC del instante que
  //? devuelve son la hora de pared de la sede, para poder compararla contra
  //? `openingHours` y contra los slots, que usan la misma convención.

  it('traduce el instante a la hora de pared de la sede', () => {
    // 01:32Z del 4 de septiembre es 21:32 del 3 en Caracas (UTC-4).
    const AT = new Date('2026-09-04T01:32:00.000Z');

    const RESULT = venueWallClockNowSV(AT, 'America/Caracas');

    expect(RESULT.toISOString()).toBe('2026-09-03T21:32:00.000Z');
  });

  it('no desplaza nada cuando la sede está en UTC', () => {
    const AT = new Date('2026-09-04T01:32:00.000Z');

    const RESULT = venueWallClockNowSV(AT, 'UTC');

    expect(RESULT.toISOString()).toBe('2026-09-04T01:32:00.000Z');
  });

  it('cruza el día hacia adelante cuando la sede va por delante de UTC', () => {
    // 22:10Z del 3 es 07:10 del 4 en Tokio (UTC+9).
    const AT = new Date('2026-09-03T22:10:00.000Z');

    const RESULT = venueWallClockNowSV(AT, 'Asia/Tokyo');

    expect(RESULT.toISOString()).toBe('2026-09-04T07:10:00.000Z');
  });

  it('respeta el horario de verano de la zona', () => {
    // Madrid en septiembre está en CEST (UTC+2), no en CET (UTC+1).
    const AT = new Date('2026-09-03T22:10:00.000Z');

    const RESULT = venueWallClockNowSV(AT, 'Europe/Madrid');

    expect(RESULT.toISOString()).toBe('2026-09-04T00:10:00.000Z');
  });

  it('cae en America/Caracas cuando la timezone no es válida', () => {
    const AT = new Date('2026-09-04T01:32:00.000Z');

    const RESULT = venueWallClockNowSV(AT, 'No/Existe');

    expect(RESULT.toISOString()).toBe('2026-09-03T21:32:00.000Z');
  });
});
