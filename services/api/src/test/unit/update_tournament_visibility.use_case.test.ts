import { beforeEach, describe, expect, it, vi } from 'vitest';

import { UpdateTournamentVisibilityUseCase } from '../../application/use_cases/update_tournament_visibility.use_case.js';

const mockTournamentRepository = {
  findByIdSV: vi.fn(),
  updateVisibilitySV: vi.fn(),
};

const mockAssertTournamentOrganizerAccess = {
  executeSV: vi.fn(),
};

const useCase = new UpdateTournamentVisibilityUseCase(
  mockTournamentRepository as never,
  mockAssertTournamentOrganizerAccess as never,
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
  visibility: 'PUBLIC',
  startsAt: null,
  organizerUserId: 'organizer-1',
  venueId: null,
  createdAt: new Date(),
  updatedAt: new Date(),
};

beforeEach(() => {
  vi.clearAllMocks();
  mockTournamentRepository.findByIdSV.mockResolvedValue(BASE_TOURNAMENT);
  mockTournamentRepository.updateVisibilitySV.mockResolvedValue({
    id: 'tournament-1',
    name: 'Torneo Demo',
    visibility: 'PRIVATE',
  });
});

describe('UpdateTournamentVisibilityUseCase', () => {
  it('should update the visibility to PRIVATE for the organizer', async () => {
    const RESULT = await useCase.executeSV({
      tournamentId: 'tournament-1',
      visibility: 'PRIVATE',
      actorUserId: 'organizer-1',
    });

    expect(RESULT.visibility).toBe('PRIVATE');
    expect(mockTournamentRepository.updateVisibilitySV).toHaveBeenCalledWith(
      'tournament-1',
      'PRIVATE',
    );
  });

  it('should throw NO_ENCONTRADO when the tournament does not exist', async () => {
    mockTournamentRepository.findByIdSV.mockResolvedValue(null);

    await expect(
      useCase.executeSV({
        tournamentId: 'missing',
        visibility: 'PUBLIC',
        actorUserId: 'organizer-1',
      }),
    ).rejects.toThrow('Torneo no encontrado.');
  });
});