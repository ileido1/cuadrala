import { describe, expect, it } from 'vitest';

import {
  closedDayMessage,
  dayKeyFromIsoDate,
  getDayHoursForDate,
  isVenueOpenOnDate,
  validateTimeWithinDayHours,
} from './venue-opening-hours';

const HOURS = {
  monday: { open: '08:00', close: '23:00' },
  tuesday: { open: '08:00', close: '23:00' },
  wednesday: { open: '08:00', close: '23:00' },
  thursday: { open: '08:00', close: '23:00' },
  friday: { open: '08:00', close: '23:00' },
  saturday: { open: '08:00', close: '23:00' },
};

describe('venue-opening-hours', () => {
  it('should treat sunday as closed when absent from openingHours', () => {
    expect(dayKeyFromIsoDate('2026-05-17')).toBe('sunday');
    expect(isVenueOpenOnDate('2026-05-17', HOURS)).toBe(false);
    expect(getDayHoursForDate('2026-05-17', HOURS)).toBeNull();
    expect(closedDayMessage('2026-05-17', HOURS)).toContain('Domingo');
  });

  it('should close sunday when openingHours is null', () => {
    expect(isVenueOpenOnDate('2026-05-17', null)).toBe(false);
    expect(isVenueOpenOnDate('2026-05-18', null)).toBe(true);
  });

  it('should validate time within day hours', () => {
    const H = getDayHoursForDate('2026-05-18', HOURS)!;
    expect(validateTimeWithinDayHours('10:00', 90, H.openMinutes, H.closeMinutes)).toBeNull();
    expect(
      validateTimeWithinDayHours('22:30', 90, H.openMinutes, H.closeMinutes),
    ).not.toBeNull();
  });
});
