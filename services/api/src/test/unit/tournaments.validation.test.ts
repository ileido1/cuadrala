import { describe, it, expect } from 'vitest';
import {
  LIST_TOURNAMENTS_QUERY_SCHEMA,
  TOURNAMENT_ID_PARAM_SCHEMA,
} from '../../presentation/validation/tournaments.validation.js';

describe('LIST_TOURNAMENTS_QUERY_SCHEMA', () => {
  it('should parse valid query params with all fields', () => {
    const result = LIST_TOURNAMENTS_QUERY_SCHEMA.parse({
      status: 'OPEN',
      sportId: '123e4567-e89b-12d3-a456-426614174000',
      categoryId: '123e4567-e89b-12d3-a456-426614174001',
      page: '2',
      limit: '50',
    });

    expect(result.status).toBe('OPEN');
    expect(result.sportId).toBe('123e4567-e89b-12d3-a456-426614174000');
    expect(result.categoryId).toBe('123e4567-e89b-12d3-a456-426614174001');
    expect(result.page).toBe(2);
    expect(result.limit).toBe(50);
  });

  it('should use defaults for page and limit when not provided', () => {
    const result = LIST_TOURNAMENTS_QUERY_SCHEMA.parse({});

    expect(result.page).toBe(1);
    expect(result.limit).toBe(20);
  });

  it('should throw on invalid status', () => {
    expect(() =>
      LIST_TOURNAMENTS_QUERY_SCHEMA.parse({ status: 'INVALID' })
    ).toThrow();
  });

  it('should throw on page less than 1', () => {
    expect(() =>
      LIST_TOURNAMENTS_QUERY_SCHEMA.parse({ page: '0' })
    ).toThrow();
  });

  it('should throw on limit greater than 100', () => {
    expect(() =>
      LIST_TOURNAMENTS_QUERY_SCHEMA.parse({ limit: '101' })
    ).toThrow();
  });

  it('should throw on invalid UUID for sportId', () => {
    expect(() =>
      LIST_TOURNAMENTS_QUERY_SCHEMA.parse({ sportId: 'not-a-uuid' })
    ).toThrow('sportId debe ser un UUID valido.');
  });

  it('should accept all valid tournament statuses', () => {
    const statuses = ['DRAFT', 'OPEN', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED'];
    for (const status of statuses) {
      const result = LIST_TOURNAMENTS_QUERY_SCHEMA.parse({ status });
      expect(result.status).toBe(status);
    }
  });

  it('should parse a valid venueId', () => {
    const result = LIST_TOURNAMENTS_QUERY_SCHEMA.parse({
      venueId: '123e4567-e89b-12d3-a456-426614174000',
    });

    expect(result.venueId).toBe('123e4567-e89b-12d3-a456-426614174000');
  });

  it('should throw on invalid UUID for venueId', () => {
    expect(() =>
      LIST_TOURNAMENTS_QUERY_SCHEMA.parse({ venueId: 'not-a-uuid' })
    ).toThrow('venueId debe ser un UUID valido.');
  });

  it('should parse valid startsAtFrom and startsAtTo ISO datetimes', () => {
    const result = LIST_TOURNAMENTS_QUERY_SCHEMA.parse({
      startsAtFrom: '2026-06-01T00:00:00.000Z',
      startsAtTo: '2026-06-30T23:59:59.000Z',
    });

    expect(result.startsAtFrom).toBe('2026-06-01T00:00:00.000Z');
    expect(result.startsAtTo).toBe('2026-06-30T23:59:59.000Z');
  });

  it('should throw on non-ISO datetime for startsAtFrom', () => {
    expect(() =>
      LIST_TOURNAMENTS_QUERY_SCHEMA.parse({ startsAtFrom: 'not-a-date' })
    ).toThrow();
  });

  it('should throw when startsAtFrom is after startsAtTo', () => {
    expect(() =>
      LIST_TOURNAMENTS_QUERY_SCHEMA.parse({
        startsAtFrom: '2026-06-30T00:00:00.000Z',
        startsAtTo: '2026-06-01T00:00:00.000Z',
      })
    ).toThrow();
  });

  it('should accept equal startsAtFrom and startsAtTo (inclusive bounds)', () => {
    const result = LIST_TOURNAMENTS_QUERY_SCHEMA.parse({
      startsAtFrom: '2026-06-01T00:00:00.000Z',
      startsAtTo: '2026-06-01T00:00:00.000Z',
    });

    expect(result.startsAtFrom).toBe('2026-06-01T00:00:00.000Z');
    expect(result.startsAtTo).toBe('2026-06-01T00:00:00.000Z');
  });

  it('should accept only startsAtFrom (open upper bound)', () => {
    const result = LIST_TOURNAMENTS_QUERY_SCHEMA.parse({
      startsAtFrom: '2026-06-01T00:00:00.000Z',
    });

    expect(result.startsAtFrom).toBe('2026-06-01T00:00:00.000Z');
    expect(result.startsAtTo).toBeUndefined();
  });

  it('should accept a valid near value', () => {
    const result = LIST_TOURNAMENTS_QUERY_SCHEMA.parse({ near: '-34.6,-58.4' });

    expect(result.near).toBe('-34.6,-58.4');
  });

  it('should throw on invalid near format', () => {
    const result = LIST_TOURNAMENTS_QUERY_SCHEMA.safeParse({ near: 'not-a-coordinate' });

    expect(result.success).toBe(false);
    expect(result.success ? undefined : result.error.issues[0]?.message).toBe(
      'near debe ser "lat,lng".'
    );
  });

  it('should leave radiusKm undefined when not provided', () => {
    const result = LIST_TOURNAMENTS_QUERY_SCHEMA.parse({ near: '-34.6,-58.4' });

    expect(result.radiusKm).toBeUndefined();
  });

  it('should coerce a valid radiusKm', () => {
    const result = LIST_TOURNAMENTS_QUERY_SCHEMA.parse({
      near: '-34.6,-58.4',
      radiusKm: '25',
    });

    expect(result.radiusKm).toBe(25);
  });

  it('should reject an out-of-range radiusKm with a Spanish message', () => {
    const zero = LIST_TOURNAMENTS_QUERY_SCHEMA.safeParse({ near: '-34.6,-58.4', radiusKm: '0' });
    const tooBig = LIST_TOURNAMENTS_QUERY_SCHEMA.safeParse({ near: '-34.6,-58.4', radiusKm: '201' });

    expect(zero.success ? undefined : zero.error.issues[0]?.message).toBe('radiusKm debe ser mayor a 0.');
    expect(tooBig.success ? undefined : tooBig.error.issues[0]?.message).toBe(
      'radiusKm no puede superar 200.'
    );
  });
});

describe('TOURNAMENT_ID_PARAM_SCHEMA', () => {
  it('should parse valid UUID', () => {
    const result = TOURNAMENT_ID_PARAM_SCHEMA.parse({
      tournamentId: '123e4567-e89b-12d3-a456-426614174000',
    });
    expect(result.tournamentId).toBe('123e4567-e89b-12d3-a456-426614174000');
  });

  it('should throw on invalid UUID', () => {
    expect(() =>
      TOURNAMENT_ID_PARAM_SCHEMA.parse({ tournamentId: 'not-a-uuid' })
    ).toThrow('tournamentId debe ser un UUID valido.');
  });

  it('should throw on missing tournamentId', () => {
    expect(() => TOURNAMENT_ID_PARAM_SCHEMA.parse({})).toThrow();
  });
});