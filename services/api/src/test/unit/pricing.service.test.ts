import { describe, expect, it } from 'vitest';

import { AppError } from '../../domain/errors/app_error.js';
import {
  assertValidPricingTimeRangeSV,
  calculateReservationTotalCentsSV,
  resolvePricePerHourCentsAtMinutesSV,
} from '../../domain/services/booking/pricing.service.js';

describe('assertValidPricingTimeRangeSV', () => {
  it('should pass when startTime is before endTime', () => {
    expect(() => assertValidPricingTimeRangeSV('08:00', '12:00')).not.toThrow();
  });

  it('should throw HORA_INVALIDA when startTime is not before endTime', () => {
    expect(() => assertValidPricingTimeRangeSV('14:00', '10:00')).toThrow(AppError);
    expect(() => assertValidPricingTimeRangeSV('10:00', '10:00')).toThrow(AppError);
  });
});

describe('resolvePricePerHourCentsAtMinutesSV', () => {
  const TIERS = [
    {
      startTime: '08:00',
      endTime: '12:00',
      pricePerHourCents: 2000,
    },
    {
      startTime: '13:00',
      endTime: '23:00',
      pricePerHourCents: 2500,
    },
  ];

  it('should return tier price when slot is inside tier', () => {
    expect(
      resolvePricePerHourCentsAtMinutesSV(18 * 60, 2000, TIERS),
    ).toBe(2500);
  });

  it('should return base price in gap between tiers', () => {
    expect(
      resolvePricePerHourCentsAtMinutesSV(12 * 60 + 30, 2000, TIERS),
    ).toBe(2000);
  });
});

describe('calculateReservationTotalCentsSV', () => {
  const TIERS = [
    {
      startTime: '08:00',
      endTime: '12:00',
      pricePerHourCents: 2000,
    },
    {
      startTime: '13:00',
      endTime: '23:00',
      pricePerHourCents: 2500,
    },
  ];

  it('should use base price when no tiers exist', () => {
    const TOTAL = calculateReservationTotalCentsSV({
      pricePerHourCents: 2000,
      pricingTiers: [],
      scheduledAt: new Date('2026-05-18T18:00:00.000Z'),
      durationMinutes: 90,
    });
    expect(TOTAL).toBe(3000);
  });

  it('should apply nocturnal tier at 18:00 for 90 minutes', () => {
    const TOTAL = calculateReservationTotalCentsSV({
      pricePerHourCents: 2000,
      pricingTiers: TIERS,
      scheduledAt: new Date('2026-05-18T18:00:00.000Z'),
      durationMinutes: 90,
    });
    expect(TOTAL).toBe(3750);
  });

  it('should split cost when reservation crosses tier boundaries', () => {
    const TOTAL = calculateReservationTotalCentsSV({
      pricePerHourCents: 2000,
      pricingTiers: TIERS,
      scheduledAt: new Date('2026-05-18T11:30:00.000Z'),
      durationMinutes: 90,
    });
    // 30 min @ 2000 + 60 min gap @ 2000 base = 1000 + 2000
    expect(TOTAL).toBe(3000);
  });

  it('should return null when no price is configured', () => {
    const TOTAL = calculateReservationTotalCentsSV({
      pricePerHourCents: null,
      pricingTiers: [],
      scheduledAt: new Date('2026-05-18T18:00:00.000Z'),
      durationMinutes: 60,
    });
    expect(TOTAL).toBeNull();
  });
});
