import { describe, expect, it, vi } from 'vitest';

import { WithdrawTournamentRegistrationUseCase } from '../../application/use_cases/withdraw_tournament_registration.use_case.js';

const mockTournamentRepository = {
  findByIdSV: vi.fn(),
  createTournamentSV: vi.fn(),
  updateStatusSV: vi.fn(),
};

const mockRegistrationRepository = {
  disableByTournamentAndUserSV: vi.fn(),
};

const useCase = new WithdrawTournamentRegistrationUseCase(
  mockTournamentRepository as never,
  mockRegistrationRepository as never,
);

const BASE_TOURNAMENT = {
  id: 'tournament-1',
  name: 'Torneo Demo',
  sportId: 'sport-1',
  categoryId: 'category-1',
  formatPresetId: 'preset-1',
  presetSchemaVersion: 1,
  formatParameters: null,
  status: 'DRAFT',
  startsAt: null,
  organizerUserId: 'organizer-1',
  venueId: null,
  createdAt: new Date(),
  updatedAt: new Date(),
};

describe('WithdrawTournamentRegistrationUseCase', () => {
  it('should throw TORNEO_NO_ENCONTRADO when tournament does not exist', async () => {
    mockTournamentRepository.findByIdSV.mockResolvedValue(null);

    await expect(
      useCase.executeSV({ tournamentId: 'missing-tournament', userId: 'user-1' }),
    ).rejects.toThrow('El torneo indicado no existe.');
  });

  it('should reject the withdrawal with 409 once the tournament reaches IN_PROGRESS (roster lock)', async () => {
    mockTournamentRepository.findByIdSV.mockResolvedValue({
      ...BASE_TOURNAMENT,
      status: 'IN_PROGRESS',
    });

    await expect(
      useCase.executeSV({ tournamentId: 'tournament-1', userId: 'user-1' }),
    ).rejects.toMatchObject({
      code: 'TORNEO_CERRADO',
      statusCode: 409,
    });

    expect(mockRegistrationRepository.disableByTournamentAndUserSV).not.toHaveBeenCalled();
  });

  it('should withdraw the registration when the tournament is still DRAFT or OPEN', async () => {
    mockTournamentRepository.findByIdSV.mockResolvedValue({ ...BASE_TOURNAMENT, status: 'OPEN' });
    mockRegistrationRepository.disableByTournamentAndUserSV.mockResolvedValue(true);

    await useCase.executeSV({ tournamentId: 'tournament-1', userId: 'user-1' });

    expect(mockRegistrationRepository.disableByTournamentAndUserSV).toHaveBeenCalledWith(
      'tournament-1',
      'user-1',
    );
  });
});
