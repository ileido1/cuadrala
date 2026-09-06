import { describe, expect, it } from 'vitest';

import {
  DEFAULT_HOLD_TTL_HOURS,
  holdExpiresAtSV,
  isHoldExpiredSV,
  occupiesSlotSV,
} from '../../domain/reservation/reservation_slot.js';

describe('occupiesSlotSV', () => {
  //? Espeja el indice parcial `Reservation_court_slot_live_uniq`.
  it('should treat held and confirmed reservations as occupying the court', () => {
    expect(occupiesSlotSV('HELD')).toBe(true);
    expect(occupiesSlotSV('CONFIRMED')).toBe(true);
  });

  //? Antes cancelar dejaba la fila y el unique cubria todas: el turno quedaba
  //? tomado para siempre y no se podia volver a reservar.
  it('should free the court once the reservation is cancelled or expired', () => {
    expect(occupiesSlotSV('CANCELLED')).toBe(false);
    expect(occupiesSlotSV('EXPIRED')).toBe(false);
  });
});

describe('isHoldExpiredSV', () => {
  const NOW = new Date('2026-09-05T12:00:00.000Z');

  it('should expire a hold once its deadline passed', () => {
    const PAST = new Date('2026-09-05T11:59:59.000Z');
    expect(isHoldExpiredSV({ status: 'HELD', holdExpiresAt: PAST }, NOW)).toBe(true);
  });

  it('should keep a hold alive before its deadline', () => {
    const FUTURE = new Date('2026-09-06T12:00:00.000Z');
    expect(isHoldExpiredSV({ status: 'HELD', holdExpiresAt: FUTURE }, NOW)).toBe(false);
  });

  //? Fallar del lado de soltar: un HELD sin vencimiento bloquearia la cancha
  //? indefinidamente, que es justo lo que el vencimiento existe para evitar.
  it('should expire a hold that somehow has no deadline', () => {
    expect(isHoldExpiredSV({ status: 'HELD', holdExpiresAt: null }, NOW)).toBe(true);
  });

  it('should never expire a reservation that is already firm', () => {
    const PAST = new Date('2020-01-01T00:00:00.000Z');
    expect(isHoldExpiredSV({ status: 'CONFIRMED', holdExpiresAt: PAST }, NOW)).toBe(false);
  });
});

describe('holdExpiresAtSV', () => {
  it('should default to the shared TTL', () => {
    const NOW = new Date('2026-09-05T12:00:00.000Z');
    const EXPECTED = new Date(NOW.getTime() + DEFAULT_HOLD_TTL_HOURS * 3600 * 1000);
    expect(holdExpiresAtSV(NOW)).toEqual(EXPECTED);
  });
});
