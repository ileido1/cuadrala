import { describe, it, expect, vi } from 'vitest';
import { ListTournamentsUseCase } from '../../application/use_cases/list_tournaments.use_case.js';

// Mock repository
const mockRepository = {
  listTournamentsSV: vi.fn(),
  getTournamentByIdSV: vi.fn(),
  listTournamentRegistrationsSV: vi.fn(),
};

const useCase = new ListTournamentsUseCase(mockRepository);

describe('ListTournamentsUseCase', () => {
  it('should return paginated results when called with valid params', async () => {
    mockRepository.listTournamentsSV.mockResolvedValue({
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

    const result = await useCase.executeSV({ page: 1, limit: 20 });

    expect(result.items).toHaveLength(1);
    expect(result.pageInfo.page).toBe(1);
    expect(result.pageInfo.limit).toBe(20);
    expect(result.pageInfo.total).toBe(1);
    expect(mockRepository.listTournamentsSV).toHaveBeenCalledWith(
      {},
      { page: 1, limit: 20 }
    );
  });

  it('should throw PAGINACION_INVALIDA when page is less than 1', async () => {
    await expect(
      useCase.executeSV({ page: 0, limit: 20 })
    ).rejects.toThrow('page debe ser mayor o igual a 1.');
  });

  it('should throw PAGINACION_INVALIDA when limit is less than 1', async () => {
    await expect(
      useCase.executeSV({ page: 1, limit: 0 })
    ).rejects.toThrow('limit debe estar entre 1 y 100.');
  });

  it('should throw PAGINACION_INVALIDA when limit exceeds 100', async () => {
    await expect(
      useCase.executeSV({ page: 1, limit: 101 })
    ).rejects.toThrow('limit debe estar entre 1 y 100.');
  });

  it('should pass status filter to repository', async () => {
    mockRepository.listTournamentsSV.mockResolvedValue({ items: [], total: 0 });

    await useCase.executeSV({ page: 1, limit: 20, status: 'OPEN' });

    expect(mockRepository.listTournamentsSV).toHaveBeenCalledWith(
      { status: 'OPEN' },
      { page: 1, limit: 20 }
    );
  });

  it('should pass sportId filter to repository', async () => {
    mockRepository.listTournamentsSV.mockResolvedValue({ items: [], total: 0 });

    await useCase.executeSV({ page: 1, limit: 20, sportId: 'sport-uuid' });

    expect(mockRepository.listTournamentsSV).toHaveBeenCalledWith(
      { sportId: 'sport-uuid' },
      { page: 1, limit: 20 }
    );
  });
});