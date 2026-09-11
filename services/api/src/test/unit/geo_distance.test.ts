import { describe, expect, it } from 'vitest';

import {
  haversineDistanceKmSV,
  kmToLatitudeDeltaSV,
  kmToLongitudeDeltaSV,
} from '../../domain/geo/geo_distance.js';

describe('haversineDistanceKmSV', () => {
  it('returns 0 for identical coordinates', () => {
    expect(haversineDistanceKmSV(-34.6037, -58.3816, -34.6037, -58.3816)).toBe(0);
  });

  it('returns ~111km for a 1 degree separation in latitude at the equator', () => {
    const DISTANCE = haversineDistanceKmSV(0, 0, 1, 0);
    expect(DISTANCE).toBeGreaterThan(110);
    expect(DISTANCE).toBeLessThan(112);
  });
});

describe('kmToLatitudeDeltaSV', () => {
  it('converts a 10km radius into a latitude delta close to 0.09 degrees', () => {
    const DELTA = kmToLatitudeDeltaSV(10);
    expect(DELTA).toBeGreaterThan(0.08);
    expect(DELTA).toBeLessThan(0.1);
  });
});

describe('kmToLongitudeDeltaSV', () => {
  it('widens the longitude delta as latitude approaches the poles', () => {
    const DELTA_EQUATOR = kmToLongitudeDeltaSV(10, 0);
    const DELTA_HIGH_LAT = kmToLongitudeDeltaSV(10, 60);
    expect(DELTA_HIGH_LAT).toBeGreaterThan(DELTA_EQUATOR);
  });
});
