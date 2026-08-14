/**
 * Change: sdd/venue-geo-search (PR1 — Phase 1)
 * Contrato Zod para el filtro `sportType` en GET /api/v1/venues.
 */
import { describe, it, expect } from 'vitest';
import { LIST_VENUES_QUERY_SCHEMA } from '../../presentation/validation/venues.validation.js';

describe('LIST_VENUES_QUERY_SCHEMA — sportType filter', () => {
  it('acepta sportType=PADEL', () => {
    const result = LIST_VENUES_QUERY_SCHEMA.parse({ sportType: 'PADEL' });
    expect(result.sportType).toBe('PADEL');
  });

  it('acepta sportType=TENNIS', () => {
    const result = LIST_VENUES_QUERY_SCHEMA.parse({ sportType: 'TENNIS' });
    expect(result.sportType).toBe('TENNIS');
  });

  it('permite omitir sportType (campo opcional)', () => {
    const result = LIST_VENUES_QUERY_SCHEMA.parse({});
    expect(result.sportType).toBeUndefined();
  });

  it('rechaza sportType=FOOBAR', () => {
    expect(() => LIST_VENUES_QUERY_SCHEMA.parse({ sportType: 'FOOBAR' })).toThrow();
  });

  it('rechaza sportType en minúsculas (enum case-sensitive)', () => {
    expect(() => LIST_VENUES_QUERY_SCHEMA.parse({ sportType: 'padel' })).toThrow();
  });

  it('mantiene defaults de radiusKm/limit/page al filtrar por sportType', () => {
    const result = LIST_VENUES_QUERY_SCHEMA.parse({ sportType: 'PADEL' });
    expect(result.radiusKm).toBe(10);
    expect(result.limit).toBe(20);
    expect(result.page).toBe(1);
  });
});
