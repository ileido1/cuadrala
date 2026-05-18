import { describe, expect, it } from 'vitest';

import {
  formatScheduledAtForDisplay,
  scheduledAtToCalendarDate,
  wallClockRangeFromScheduledAt,
} from './schedule-datetime';

describe('schedule-datetime', () => {
  it('should use UTC wall clock for display range', () => {
    const RANGE = wallClockRangeFromScheduledAt(
      '2026-05-19T09:30:00.000Z',
      90,
    );
    expect(RANGE.timeStart).toBe('09:30');
    expect(RANGE.timeEnd).toBe('11:00');
  });

  it('should extract calendar date from iso prefix', () => {
    expect(scheduledAtToCalendarDate('2026-05-19T09:30:00.000Z')).toBe(
      '2026-05-19',
    );
  });

  it('should display wall clock time not browser local offset', () => {
    const { timeStr } = formatScheduledAtForDisplay(
      '2026-05-19T09:30:00.000Z',
    );
    expect(timeStr).toMatch(/09:30/i);
    expect(timeStr).not.toMatch(/04:00/i);
  });
});
