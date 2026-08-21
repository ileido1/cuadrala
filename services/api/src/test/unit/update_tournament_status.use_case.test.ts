import { describe, expect, it, vi } from 'vitest';

import { UpdateTournamentStatusUseCase } from '../../application/use_cases/update_tournament_status.use_case.js';

const mockTournamentRepository = {
  findByIdSV: vi.fn(),
  createTournamentSV: vi.fn(),
  updateStatusSV: vi.fn(),
};

const mockAssertTournamentOrganizerAccess = {
  executeSV: vi.fn(),
};

const mockMaterializeTournamentMatches = {
  executeSV: vi.fn(),
};

const useCase = new UpdateTournamentStatusUseCase(
  mockTournamentRepository,
  mockAssertTournamentOrganizerAccess as never,
  mockMaterializeTournamentMatches as never,
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

describe('UpdateTournamentStatusUseCase', () => {
  it('should throw NO_ENCONTRADO when tournament does not exist', async () => {
    mockTournamentRepository.findByIdSV.mockResolvedValue(null);

    await expect(
      useCase.executeSV({
        tournamentId: 'missing-tournament',
        status: 'OPEN',
        actorUserId: 'organizer-1',
      }),
    ).rejects.toThrow('Torneo no encontrado.');
  });

  it('should reject the transition when the actor is not the organizer (403)', async () => {
    mockTournamentRepository.findByIdSV.mockResolvedValue(BASE_TOURNAMENT);
    mockAssertTournamentOrganizerAccess.executeSV.mockRejectedValue(
      Object.assign(new Error('No tienes permisos para administrar este torneo.'), {
        statusCode: 403,
      }),
    );

    await expect(
      useCase.executeSV({
        tournamentId: 'tournament-1',
        status: 'OPEN',
        actorUserId: 'outsider-1',
      }),
    ).rejects.toThrow('No tienes permisos para administrar este torneo.');
  });

  it('should reject an illegal transition (409)', async () => {
    mockTournamentRepository.findByIdSV.mockResolvedValue({
      ...BASE_TOURNAMENT,
      status: 'COMPLETED',
    });
    mockAssertTournamentOrganizerAccess.executeSV.mockResolvedValue(undefined);

    await expect(
      useCase.executeSV({
        tournamentId: 'tournament-1',
        status: 'OPEN',
        actorUserId: 'organizer-1',
      }),
    ).rejects.toThrow('Transición de estado inválida');
  });

  it('should return updated tournament status when the transition is legal', async () => {
    mockTournamentRepository.findByIdSV.mockResolvedValue(BASE_TOURNAMENT);
    mockAssertTournamentOrganizerAccess.executeSV.mockResolvedValue(undefined);
    mockTournamentRepository.updateStatusSV.mockResolvedValue({
      id: 'tournament-1',
      name: 'Torneo Demo',
      status: 'OPEN',
    });

    const RESULT = await useCase.executeSV({
      tournamentId: 'tournament-1',
      status: 'OPEN',
      actorUserId: 'organizer-1',
    });

    expect(RESULT).toEqual({
      id: 'tournament-1',
      name: 'Torneo Demo',
      status: 'OPEN',
    });
  });

  it('delegates the OPEN→IN_PROGRESS transition to MaterializeTournamentMatchesUseCase instead of a plain status update', async () => {
    mockTournamentRepository.findByIdSV.mockResolvedValue({ ...BASE_TOURNAMENT, status: 'OPEN' });
    mockAssertTournamentOrganizerAccess.executeSV.mockResolvedValue(undefined);
    mockMaterializeTournamentMatches.executeSV.mockResolvedValue({
      id: 'tournament-1',
      name: 'Torneo Demo',
      status: 'IN_PROGRESS',
    });

    const RESULT = await useCase.executeSV({
      tournamentId: 'tournament-1',
      status: 'IN_PROGRESS',
      actorUserId: 'organizer-1',
    });

    expect(RESULT).toEqual({ id: 'tournament-1', name: 'Torneo Demo', status: 'IN_PROGRESS' });
    expect(mockMaterializeTournamentMatches.executeSV).toHaveBeenCalledWith({
      tournamentId: 'tournament-1',
      toStatus: 'IN_PROGRESS',
      sportId: 'sport-1',
      categoryId: 'category-1',
      organizerUserId: 'organizer-1',
      startsAt: null,
    });
  });

  it('falls back to actorUserId as organizerUserId when the tournament has no organizer assigned yet', async () => {
    mockTournamentRepository.findByIdSV.mockResolvedValue({
      ...BASE_TOURNAMENT,
      status: 'OPEN',
      organizerUserId: null,
    });
    mockAssertTournamentOrganizerAccess.executeSV.mockResolvedValue(undefined);
    mockMaterializeTournamentMatches.executeSV.mockResolvedValue({
      id: 'tournament-1',
      name: 'Torneo Demo',
      status: 'IN_PROGRESS',
    });

    await useCase.executeSV({
      tournamentId: 'tournament-1',
      status: 'IN_PROGRESS',
      actorUserId: 'venue-staff-1',
    });

    expect(mockMaterializeTournamentMatches.executeSV).toHaveBeenCalledWith(
      expect.objectContaining({ organizerUserId: 'venue-staff-1' }),
    );
  });
});
