import { describe, expect, it, vi } from 'vitest';

import { UpdateTournamentStatusUseCase } from '../../application/use_cases/update_tournament_status.use_case.js';

const mockTournamentRepository = {
  findByIdSV: vi.fn(),
  createTournamentSV: vi.fn(),
  updateStatusSV: vi.fn(),
};

const useCase = new UpdateTournamentStatusUseCase(mockTournamentRepository);

describe('UpdateTournamentStatusUseCase', () => {
  it('should throw NO_ENCONTRADO when tournament does not exist', async () => {
    mockTournamentRepository.updateStatusSV.mockResolvedValue(null);

    await expect(
      useCase.executeSV({
        tournamentId: 'missing-tournament',
        status: 'OPEN',
      }),
    ).rejects.toThrow('Torneo no encontrado.');
  });

  it('should return updated tournament status when tournament exists', async () => {
    mockTournamentRepository.updateStatusSV.mockResolvedValue({
      id: 'tournament-1',
      name: 'Torneo Demo',
      status: 'OPEN',
    });

    const RESULT = await useCase.executeSV({
      tournamentId: 'tournament-1',
      status: 'OPEN',
    });

    expect(RESULT).toEqual({
      id: 'tournament-1',
      name: 'Torneo Demo',
      status: 'OPEN',
    });
  });
});
