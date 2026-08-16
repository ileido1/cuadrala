import { describe, expect, it } from 'vitest';

import { DEFAULT_VENUE_TIMEZONE, resolveVenueTimezone } from './venue-timezone';

describe('venue-timezone', () => {
  it('should mark isFallback: true when venue.timezone is null (A7)', () => {
    const RESULT = resolveVenueTimezone({ timezone: null });
    expect(RESULT.isFallback).toBe(true);
    expect(RESULT.timezone).toBe(DEFAULT_VENUE_TIMEZONE);
  });

  it('should mark isFallback: true when venue.timezone is undefined', () => {
    const RESULT = resolveVenueTimezone({});
    expect(RESULT.isFallback).toBe(true);
    expect(RESULT.timezone).toBe(DEFAULT_VENUE_TIMEZONE);
  });

  it('should respect the real venue timezone when present', () => {
    const RESULT = resolveVenueTimezone({ timezone: 'America/Bogota' });
    expect(RESULT.isFallback).toBe(false);
    expect(RESULT.timezone).toBe('America/Bogota');
  });

  it('should mark isFallback: true when venue is null/undefined', () => {
    expect(resolveVenueTimezone(null).isFallback).toBe(true);
    expect(resolveVenueTimezone(undefined).isFallback).toBe(true);
  });
});
