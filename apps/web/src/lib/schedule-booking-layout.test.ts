import { describe, expect, it } from 'vitest';

import { layoutOverlappingBookings } from './schedule-booking-layout';

describe('layoutOverlappingBookings', () => {
  it('should use full width when only one booking', () => {
    const LAYOUT = layoutOverlappingBookings([
      {
        id: 'a',
        timeStart: '09:00',
        timeEnd: '10:30',
      },
    ]);
    expect(LAYOUT[0]?.layoutColumn).toBe(0);
    expect(LAYOUT[0]?.layoutColumnCount).toBe(1);
  });

  it('should split side by side for same-time different courts', () => {
    const LAYOUT = layoutOverlappingBookings([
      { id: 'a', timeStart: '09:30', timeEnd: '11:00' },
      { id: 'b', timeStart: '09:30', timeEnd: '11:00' },
    ]);
    const COLUMNS = LAYOUT.map((b) => b.layoutColumn).sort();
    expect(COLUMNS).toEqual([0, 1]);
    expect(LAYOUT.every((b) => b.layoutColumnCount === 2)).toBe(true);
  });

  it('should not split non-overlapping bookings', () => {
    const LAYOUT = layoutOverlappingBookings([
      { id: 'a', timeStart: '08:00', timeEnd: '09:30' },
      { id: 'b', timeStart: '09:30', timeEnd: '11:00' },
    ]);
    expect(LAYOUT.every((b) => b.layoutColumnCount === 1)).toBe(true);
  });
});
