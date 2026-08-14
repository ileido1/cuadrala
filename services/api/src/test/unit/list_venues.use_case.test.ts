/**
 * Change: sdd/venue-geo-search (PR1 — Phase 1)
 * ListVenuesUseCase — forwarding del filtro sportType al repository.
 */
import { describe, expect, it, vi } from 'vitest';

import { ListVenuesUseCase } from '../../application/use_cases/venue_catalog.use_cases.js';
import type { VenueRepository } from '../../domain/ports/venue_repository.js';

function buildRepo(): VenueRepository {
  return {
    findByIdSV: vi.fn(),
    getOpeningHoursSV: vi.fn(),
    updateSV: vi.fn(),
    getPaymentInfoSV: vi.fn(),
    listVenuesSV: vi.fn().mockResolvedValue({ items: [], total: 0 }),
    listVenuesNearSV: vi.fn().mockResolvedValue({ items: [], total: 0 }),
    listVenuesForUserSV: vi.fn(),
    createVenueSV: vi.fn(),
    getVenueDetailSV: vi.fn(),
    getPaymentInfoWithNameSV: vi.fn(),
  };
}

describe('ListVenuesUseCase — sportType forwarding', () => {
  it('pasa sportType a listVenuesNearSV cuando hay near + sportType', async () => {
    const REPO = buildRepo();
    const UC = new ListVenuesUseCase(REPO);

    await UC.executeSV({
      page: 1,
      limit: 20,
      near: '-34.6,-58.4',
      radiusKm: 25,
      sportType: 'PADEL',
    });

    expect(REPO.listVenuesNearSV).toHaveBeenCalledWith(
      expect.objectContaining({
        lat: -34.6,
        lng: -58.4,
        radiusKm: 25,
        sportType: 'PADEL',
      }),
    );
  });

  it('pasa sportType a listVenuesSV cuando no hay near', async () => {
    const REPO = buildRepo();
    const UC = new ListVenuesUseCase(REPO);

    await UC.executeSV({ page: 1, limit: 20, radiusKm: 25, sportType: 'TENNIS' });

    expect(REPO.listVenuesSV).toHaveBeenCalledWith(
      expect.objectContaining({ page: 1, limit: 20, sportType: 'TENNIS' }),
    );
  });

  it('no pasa sportType cuando está ausente (con near)', async () => {
    const REPO = buildRepo();
    const UC = new ListVenuesUseCase(REPO);

    await UC.executeSV({ page: 1, limit: 20, near: '-34.6,-58.4', radiusKm: 25 });

    expect(REPO.listVenuesNearSV).toHaveBeenCalledWith(
      expect.not.objectContaining({ sportType: expect.anything() }),
    );
  });

  it('no pasa sportType cuando está ausente (sin near)', async () => {
    const REPO = buildRepo();
    const UC = new ListVenuesUseCase(REPO);

    await UC.executeSV({ page: 1, limit: 20, radiusKm: 25 });

    expect(REPO.listVenuesSV).toHaveBeenCalledWith(
      expect.not.objectContaining({ sportType: expect.anything() }),
    );
  });
});
