import { describe, expect, it } from 'vitest';

import { toListItemDTO } from '../../infrastructure/adapters/prisma_tournament_query_repository.js';

const ROW = {
  id: 't1', name: 'Torneo', status: 'OPEN' as const, visibility: 'PUBLIC' as const,
  organizerUserId: null, sportId: 's', sport: { name: 'Padel' }, categoryId: 'c',
  category: { name: 'Masculino' }, startsAt: null, venueId: null, venue: null,
  inscriptionPrice: null, maxSlots: null, registrationClosesAt: null,
  gender: null,
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
