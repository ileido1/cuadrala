/**
 * Change: sdd/venue-geo-search (PR1 — Phase 1)
 * Mapper de listado de sedes — derivación de `sports[]` desde canchas activas.
 */
import { describe, expect, it } from 'vitest';

import { mapVenueListItemSV } from '../../infrastructure/adapters/prisma_venue_repository.js';

function makeRow(overrides: Partial<Parameters<typeof mapVenueListItemSV>[0]> = {}) {
  return {
    id: 'venue-1',
    name: 'Sede Test',
    address: 'Av. Siempre Viva 123',
    latitude: -34.6,
    longitude: -58.4,
    displayCurrency: 'ARS',
    pricingCurrency: 'ARS',
    createdAt: new Date('2026-01-01'),
    imageUrl: null,
    averageRating: 4.5,
    openingHours: null,
    courts: [],
    countryCode: 'VE',
    monetizationSettings: null,
    ...overrides,
  };
}

describe('mapVenueListItemSV — sports[] derivation', () => {
  it('deduplica sportType de canchas y expone sports[]', () => {
    const ROW = makeRow({
      courts: [
        { sportType: 'PADEL' },
        { sportType: 'PADEL' },
        { sportType: 'TENNIS' },
      ],
    });

    const DTO = mapVenueListItemSV(ROW);

    expect(DTO.sports).toHaveLength(2);
    expect(DTO.sports).toContain('PADEL');
    expect(DTO.sports).toContain('TENNIS');
  });

  it('retorna sports: [] cuando la sede no tiene canchas', () => {
    const DTO = mapVenueListItemSV(makeRow({ courts: [] }));
    expect(DTO.sports).toEqual([]);
  });

  it('propaga distanceKm cuando está presente', () => {
    const DTO = mapVenueListItemSV(makeRow({ courts: [], distanceKm: 3.5 }));
    expect(DTO.distanceKm).toBe(3.5);
  });

  it('omite distanceKm cuando no está presente', () => {
    const DTO = mapVenueListItemSV(makeRow({ courts: [] }));
    expect('distanceKm' in DTO).toBe(false);
  });

  it('propaga imageUrl y averageRating', () => {
    const DTO = mapVenueListItemSV(
      makeRow({ imageUrl: 'https://cdn.example.com/x.jpg', averageRating: 4.8 }),
    );
    expect(DTO.imageUrl).toBe('https://cdn.example.com/x.jpg');
    expect(DTO.averageRating).toBe(4.8);
  });

  it('propaga openingHours cuando está configurado', () => {
    const OPENING_HOURS = { monday: { open: '08:00', close: '23:00' } };
    const DTO = mapVenueListItemSV(makeRow({ openingHours: OPENING_HOURS }));
    expect(DTO.openingHours).toEqual(OPENING_HOURS);
  });

  it('propaga openingHours: null cuando la sede no lo configuró', () => {
    const DTO = mapVenueListItemSV(makeRow({ openingHours: null }));
    expect(DTO.openingHours).toBeNull();
  });
});
