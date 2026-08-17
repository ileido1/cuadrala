import { describe, expect, it, vi } from 'vitest';

import { MaterializeTournamentMatchesUseCase } from '../../application/use_cases/materialize_tournament_matches.use_case.js';

const mockTournamentScheduleRepository = {
  findByTournamentIdSV: vi.fn(),
  createOrValidateIdempotencySV: vi.fn(),
};

const mockMaterializationRepository = {
  transitionAndMaterializeSV: vi.fn(),
};

const useCase = new MaterializeTournamentMatchesUseCase(
  mockTournamentScheduleRepository as never,
  mockMaterializationRepository as never,
);

const BASE_INPUT = {
  tournamentId: 'tournament-1',
  toStatus: 'IN_PROGRESS',
  sportId: 'sport-1',
  categoryId: 'category-1',
  organizerUserId: 'organizer-1',
  startsAt: null,
};

describe('MaterializeTournamentMatchesUseCase', () => {
  it('throws 400 CALENDARIO_NO_GENERADO when the tournament has no schedule', async () => {
    mockTournamentScheduleRepository.findByTournamentIdSV.mockResolvedValue(null);

    await expect(useCase.executeSV(BASE_INPUT)).rejects.toMatchObject({
      code: 'CALENDARIO_NO_GENERADO',
      statusCode: 400,
    });
    expect(mockMaterializationRepository.transitionAndMaterializeSV).not.toHaveBeenCalled();
  });

  it('maps an AMERICANO schedule payload into match plans and delegates to the repository', async () => {
    mockTournamentScheduleRepository.findByTournamentIdSV.mockResolvedValue({
      id: 'schedule-1',
      tournamentId: 'tournament-1',
      formatCode: 'AMERICANO',
      scheduleKey: 'americano:v1:user-a,user-b,user-c,user-d',
      payload: {
        rounds: [
          {
            roundNumber: 1,
            courts: [{ courtNumber: 1, teamA: ['user-a', 'user-b'], teamB: ['user-c', 'user-d'] }],
          },
        ],
      },
      createdAt: new Date(),
      updatedAt: new Date(),
    });
    mockMaterializationRepository.transitionAndMaterializeSV.mockResolvedValue({
      created: true,
      matchCount: 1,
      tournament: { id: 'tournament-1', name: 'Torneo Demo', status: 'IN_PROGRESS' },
    });

    const RESULT = await useCase.executeSV(BASE_INPUT);

    expect(RESULT).toEqual({ id: 'tournament-1', name: 'Torneo Demo', status: 'IN_PROGRESS' });
    expect(mockMaterializationRepository.transitionAndMaterializeSV).toHaveBeenCalledWith({
      tournamentId: 'tournament-1',
      toStatus: 'IN_PROGRESS',
      scheduleKey: 'americano:v1:user-a,user-b,user-c,user-d',
      sportId: 'sport-1',
      categoryId: 'category-1',
      organizerUserId: 'organizer-1',
      matchType: 'AMERICANO',
      matches: [
        {
          roundNumber: 1,
          matchNumber: 1,
          scheduledAt: null,
          courtId: null,
          participants: [
            { userId: 'user-a', teamLabel: 'A' },
            { userId: 'user-b', teamLabel: 'A' },
            { userId: 'user-c', teamLabel: 'B' },
            { userId: 'user-d', teamLabel: 'B' },
          ],
        },
      ],
    });
  });

  it('classifies non-AMERICANO formats as REGULAR match type', async () => {
    mockTournamentScheduleRepository.findByTournamentIdSV.mockResolvedValue({
      id: 'schedule-2',
      tournamentId: 'tournament-1',
      formatCode: 'ROUND_ROBIN',
      scheduleKey: 'round_robin:v1:user-a,user-b:single',
      payload: {
        rounds: [{ roundNumber: 1, matches: [{ matchNumber: 1, playerA: 'user-a', playerB: 'user-b' }] }],
      },
      createdAt: new Date(),
      updatedAt: new Date(),
    });
    mockMaterializationRepository.transitionAndMaterializeSV.mockResolvedValue({
      created: true,
      matchCount: 1,
      tournament: { id: 'tournament-1', name: 'Torneo Demo', status: 'IN_PROGRESS' },
    });

    await useCase.executeSV(BASE_INPUT);

    expect(mockMaterializationRepository.transitionAndMaterializeSV).toHaveBeenCalledWith(
      expect.objectContaining({ matchType: 'REGULAR' }),
    );
  });
});
