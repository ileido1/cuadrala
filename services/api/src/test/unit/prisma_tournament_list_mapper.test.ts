import { describe, expect, it } from 'vitest';

import { toListItemDTO } from '../../infrastructure/adapters/prisma_tournament_query_repository.js';

const ROW = {
  id: 't1', name: 'Torneo', status: 'OPEN' as const, visibility: 'PUBLIC' as const,
  organizerUserId: null, sportId: 's', sport: { name: 'Padel' }, categoryId: 'c',
  category: { name: 'Masculino' }, startsAt: null, endsAt: null, venueId: null, venue: null,
  inscriptionPrice: null, maxSlots: null, registrationClosesAt: null,
  gender: null, organizer: null, pairedRegistration: false,
  _count: { registrations: 0 },
};

describe('toListItemDTO — distanceKm presence', () => {
  it('omits distanceKm (never null) when the row has no distanceKm', () => {
    expect('distanceKm' in toListItemDTO(ROW)).toBe(false);
  });

  it('includes distanceKm as a number when the row carries one', () => {
    expect(toListItemDTO({ ...ROW, distanceKm: 3.5 }).distanceKm).toBe(3.5);
  });
});

describe('toListItemDTO — gender', () => {
  it('returns null when the row has no declared gender', () => {
    expect(toListItemDTO(ROW).gender).toBeNull();
  });

  it('passes through the declared MatchGender', () => {
    expect(toListItemDTO({ ...ROW, gender: 'MIXED' as const }).gender).toBe('MIXED');
  });
});

describe('toListItemDTO — organizerName', () => {
  it('returns null when the tournament has no organizer', () => {
    expect(toListItemDTO(ROW).organizerName).toBeNull();
  });

  it("returns the organizer's display name when present", () => {
    expect(
      toListItemDTO({ ...ROW, organizer: { name: 'Carlos Hernández' } }).organizerName,
    ).toBe('Carlos Hernández');
  });
});

describe('toListItemDTO — pairedRegistration', () => {
  it('preserves true for tournaments registered by pairs', () => {
    const DOUBLES_ROW = { ...ROW, pairedRegistration: true };

    expect(toListItemDTO(DOUBLES_ROW)).toMatchObject({ pairedRegistration: true });
  });

  it('preserves false for tournaments registered individually', () => {
    const SINGLES_ROW = { ...ROW, pairedRegistration: false };

    expect(toListItemDTO(SINGLES_ROW)).toMatchObject({ pairedRegistration: false });
  });
});
