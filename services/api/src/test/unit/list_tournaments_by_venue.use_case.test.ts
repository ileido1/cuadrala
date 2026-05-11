import { describe, it, expect, vi } from 'vitest';
import { ListTournamentsByVenueUseCase } from '../../../application/use_cases/list_tournaments_by_venue.use_case.js';

// Mock repository
const mockRepository = {
  listTournamentsSV: vi.fn(),
  getTournamentByIdSV: vi.fn(),
  listTournamentRegistrationsSV: vi.fn(),
  listTournamentsByVenueSV: vi.fn(),
};

const useCase = new ListTournamentsByVenueUseCase(mockRepository);

describe('ListTournamentsByVenueUseCase', () => {
  it('should return paginated results when called with valid params', async () => {
    mockRepository.listTournamentsByVenueSV.mockResolvedValue({
      items: [
        {
          id: 'uuid-1',
          name: 'Torneo test',
          status: 'OPEN',
          sportId: 'sport-uuid',
          sportName: 'Padel',
          categoryId: 'cat-uuid',
          categoryName: 'Masculino',
          startsAt: '2026-06-01T00:00:00.000Z',
          registrationCount: 8,
          maxParticipants: 16,
        },
      ],
      total: 1,
    });

    const result = await useCase.executeSV({ venueId: 'venue-uuid', page: 1, limit: 20 });

    expect(result.items).toHaveLength(1);
    expect(result.pageInfo.page).toBe(1);
    expect(result.pageInfo.limit).toBe(20);
    expect(result.pageInfo.total).toBe(1);
    expect(mockRepository.listTournamentsByVenueSV).toHaveBeenCalledWith(
      'venue-uuid',
      {},
      { page: 1, limit: 20 }
    );
  });

  it('should throw PAGINACION_INVALIDA when page is less than 1', async () => {
    await expect(
      useCase.executeSV({ venueId: 'venue-uuid', page: 0, limit: 20 })
    ).rejects.toThrow('page debe ser mayor o igual a 1.');
  });

  it('should throw PAGINACION_INVALIDA when limit is less than 1', async () => {
    await expect(
      useCase.executeSV({ venueId: 'venue-uuid', page: 1, limit: 0 })
    ).rejects.toThrow('limit debe estar entre 1 y 100.');
  });

  it('should throw PAGINACION_INVALIDA when limit exceeds 100', async () => {
    await expect(
      useCase.executeSV({ venueId: 'venue-uuid', page: 1, limit: 101 })
    ).rejects.toThrow('limit debe estar entre 1 y 100.');
  });

  it('should pass status filter to repository', async () => {
    mockRepository.listTournamentsByVenueSV.mockResolvedValue({ items: [], total: 0 });

    await useCase.executeSV({ venueId: 'venue-uuid', page: 1, limit: 20, status: 'OPEN' });

    expect(mockRepository.listTournamentsByVenueSV).toHaveBeenCalledWith(
      'venue-uuid',
      { status: 'OPEN' },
      { page: 1, limit: 20 }
    );
  });

  it('should return empty list when venue has no tournaments', async () => {
    mockRepository.listTournamentsByVenueSV.mockResolvedValue({ items: [], total: 0 });

    const result = await useCase.executeSV({ venueId: 'venue-uuid', page: 1, limit: 20 });

    expect(result.items).toHaveLength(0);
    expect(result.pageInfo.total).toBe(0);
  });
});
