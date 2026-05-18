import { describe, expect, it } from 'vitest';

import {
  formatDurationLabel,
  generateCourtBlockSlots,
  getMinTimeForToday,
} from './court-time-slots';

describe('generateCourtBlockSlots', () => {
  it('should emit 90-minute consecutive blocks from 08:00', () => {
    const SLOTS = generateCourtBlockSlots({ blockDurationMinutes: 90 });
    const TIMES = SLOTS.map((s) => s.time);

    expect(TIMES).toContain('08:00');
    expect(TIMES).toContain('09:30');
    expect(TIMES).toContain('11:00');
    expect(TIMES).not.toContain('09:00');
    expect(TIMES).not.toContain('10:00');

    const FIRST = SLOTS.find((s) => s.time === '08:00');
    expect(FIRST?.endTime).toBe('09:30');
  });

  it('should emit 60-minute blocks hourly from 08:00', () => {
    const SLOTS = generateCourtBlockSlots({ blockDurationMinutes: 60 });
    const TIMES = SLOTS.map((s) => s.time);

    expect(TIMES).toEqual([
      '08:00',
      '09:00',
      '10:00',
      '11:00',
      '12:00',
      '13:00',
      '14:00',
      '15:00',
      '16:00',
      '17:00',
      '18:00',
      '19:00',
      '20:00',
      '21:00',
      '22:00',
    ]);
  });
});

describe('formatDurationLabel', () => {
  it('should format 90 minutes', () => {
    expect(formatDurationLabel(90)).toBe('1 h 30 min');
  });
});

describe('getMinTimeForToday', () => {
  it('should align to block boundary after open', () => {
    const LABEL = getMinTimeForToday(90);
    expect(LABEL).toMatch(/^\d{2}:\d{2}$/);
  });
});
