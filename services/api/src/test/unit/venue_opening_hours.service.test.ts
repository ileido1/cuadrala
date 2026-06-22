import { describe, expect, it } from 'vitest';

import { AppError } from '../../domain/errors/app_error.js';
import {
  assertReservationWithinOpeningHoursSV,
  dayKeyFromIsoDateSV,
  getDayHoursSV,
  isWithinOpeningHoursSV,
} from '../../domain/services/venue/venue_opening_hours.service.js';

describe('venue_opening_hours.service', () => {
  const HOURS = {
    monday: { open: '08:00', close: '23:00' },
    tuesday: { open: '08:00', close: '23:00' },
    wednesday: { open: '08:00', close: '23:00' },
    thursday: { open: '08:00', close: '23:00' },
    friday: { open: '08:00', close: '23:00' },
    saturday: { open: '08:00', close: '23:00' },
  };

  it('should return null hours when sunday is not in openingHours', () => {
    expect(getDayHoursSV(HOURS, 'sunday')).toBeNull();
  });

  it('should close sunday when openingHours is null in database', () => {
    expect(getDayHoursSV(null, 'sunday')).toBeNull();
    expect(getDayHoursSV(null, 'monday')).not.toBeNull();
  });

  it('should resolve day key from iso date', () => {
    expect(dayKeyFromIsoDateSV('2026-05-17')).toBe('sunday');
    expect(dayKeyFromIsoDateSV('2026-05-18')).toBe('monday');
  });

  it('should reject reservation on closed day', () => {
    expect(() =>
      assertReservationWithinOpeningHoursSV(
        new Date('2026-05-17T10:00:00.000Z'),
        60,
        HOURS,
      ),
    ).toThrow(AppError);
  });

  it('should allow reservation within open hours', () => {
    expect(() =>
      assertReservationWithinOpeningHoursSV(
        new Date('2026-05-18T10:00:00.000Z'),
        90,
        HOURS,
      ),
    ).not.toThrow();
  });

  it('should reject reservation ending after close', () => {
    expect(() =>
      assertReservationWithinOpeningHoursSV(
        new Date('2026-05-18T22:30:00.000Z'),
        90,
        HOURS,
      ),
    ).toThrow(AppError);
  });

  describe('isWithinOpeningHoursSV', () => {
    // Convención wall-clock-as-UTC: 2026-06-01 es lunes, 2026-06-07 domingo.
    it('should return true when slot fully within day hours (AC1)', () => {
      expect(
        isWithinOpeningHoursSV(new Date('2026-06-01T10:00:00.000Z'), 60, HOURS),
      ).toBe(true);
    });

    it('should return false when day is closed via null hours (AC2)', () => {
      expect(
        isWithinOpeningHoursSV(new Date('2026-06-07T10:00:00.000Z'), 60, null),
      ).toBe(false);
    });

    it('should return false when start before open (AC3)', () => {
      expect(
        isWithinOpeningHoursSV(new Date('2026-06-01T07:30:00.000Z'), 60, HOURS),
      ).toBe(false);
    });

    it('should return false when end crosses close (AC4)', () => {
      expect(
        isWithinOpeningHoursSV(new Date('2026-06-01T22:30:00.000Z'), 60, HOURS),
      ).toBe(false);
    });

    it('should return true when start exactly at open, inclusive (AC5)', () => {
      expect(
        isWithinOpeningHoursSV(new Date('2026-06-01T08:00:00.000Z'), 60, HOURS),
      ).toBe(true);
    });

    it('should return true when end exactly at close, inclusive (AC6)', () => {
      expect(
        isWithinOpeningHoursSV(new Date('2026-06-01T22:00:00.000Z'), 60, HOURS),
      ).toBe(true);
    });

    it('should return false when start exactly at close (AC7)', () => {
      expect(
        isWithinOpeningHoursSV(new Date('2026-06-01T23:00:00.000Z'), 30, HOURS),
      ).toBe(false);
    });

    it('should return true when durationMinutes <= 0 (AC8)', () => {
      expect(
        isWithinOpeningHoursSV(new Date('2026-06-07T10:00:00.000Z'), 0, null),
      ).toBe(true);
    });

    it('should use fallback Mon-Sat 08:00-23:00 when openingHours null on weekday (AC9)', () => {
      expect(
        isWithinOpeningHoursSV(new Date('2026-06-01T12:00:00.000Z'), 60, null),
      ).toBe(true);
    });

    it('should respect a specific single-window day (within)', () => {
      const WED = { wednesday: { open: '10:00', close: '12:00' } };
      expect(
        isWithinOpeningHoursSV(new Date('2026-06-10T10:00:00.000Z'), 60, WED),
      ).toBe(true);
    });

    it('should reject when slot exceeds a specific single-window day', () => {
      const WED = { wednesday: { open: '10:00', close: '12:00' } };
      expect(
        isWithinOpeningHoursSV(new Date('2026-06-10T11:00:00.000Z'), 90, WED),
      ).toBe(false);
    });
  });
});
