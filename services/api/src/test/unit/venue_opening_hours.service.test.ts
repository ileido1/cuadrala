import { describe, expect, it } from 'vitest';

import { AppError } from '../../domain/errors/app_error.js';
import {
  assertReservationWithinOpeningHoursSV,
  dayKeyFromIsoDateSV,
  getDayHoursSV,
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
});
