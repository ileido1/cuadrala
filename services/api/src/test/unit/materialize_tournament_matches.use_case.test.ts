import { beforeEach, describe, expect, it, vi } from 'vitest';

import { MaterializeTournamentMatchesUseCase } from '../../application/use_cases/materialize_tournament_matches.use_case.js';

const mockTournamentScheduleRepository = {
  findByTournamentIdSV: vi.fn(),
  createOrValidateIdempotencySV: vi.fn(),
};

const mockMaterializationRepository = {
  transitionAndMaterializeSV: vi.fn(),
};

const mockTournamentRegistrationRepository = {
  listByTournamentIdSV: vi.fn(),
};

const useCase = new MaterializeTournamentMatchesUseCase(
  mockTournamentScheduleRepository as never,
  mockMaterializationRepository as never,
  mockTournamentRegistrationRepository as never,
);

const BASE_INPUT = {
  tournamentId: 'tournament-1',
  toStatus: 'IN_PROGRESS',
  sportId: 'sport-1',
  categoryId: 'category-1',
  organizerUserId: 'organizer-1',
  startsAt: null,
};

/** 4 inscripciones AUTHENTICATED cuyo `id` coincide con los tokens usados en los payloads de test. */
const AUTH_REGISTRATIONS = ['reg-a', 'reg-b', 'reg-c', 'reg-d'].map((_id) => ({
  id: _id,
  tournamentId: 'tournament-1',
  userId: `user-${_id.slice(-1)}`,
  status: 'CONFIRMED',
  createdAt: new Date(),
}));

describe('MaterializeTournamentMatchesUseCase', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('throws 400 CALENDARIO_NO_GENERADO when the tournament has no schedule', async () => {
    mockTournamentScheduleRepository.findByTournamentIdSV.mockResolvedValue(null);

    await expect(useCase.executeSV(BASE_INPUT)).rejects.toMatchObject({
      code: 'CALENDARIO_NO_GENERADO',
      statusCode: 400,
    });
    expect(mockMaterializationRepository.transitionAndMaterializeSV).not.toHaveBeenCalled();
  });

  it('resolves registrationId tokens to userId and delegates to the repository (AMERICANO, all-authenticated roster)', async () => {
    mockTournamentScheduleRepository.findByTournamentIdSV.mockResolvedValue({
      id: 'schedule-1',
      tournamentId: 'tournament-1',
      formatCode: 'AMERICANO',
      scheduleKey: 'americano:v1:reg-a,reg-b,reg-c,reg-d',
      payload: {
        rounds: [
          {
            roundNumber: 1,
            courts: [{ courtNumber: 1, teamA: ['reg-a', 'reg-b'], teamB: ['reg-c', 'reg-d'] }],
          },
        ],
      },
      createdAt: new Date(),
      updatedAt: new Date(),
    });
    mockTournamentRegistrationRepository.listByTournamentIdSV.mockResolvedValue(AUTH_REGISTRATIONS);
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
      scheduleKey: 'americano:v1:reg-a,reg-b,reg-c,reg-d',
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
            { userId: 'user-a', tournamentRegistrationId: 'reg-a', teamLabel: 'A' },
            { userId: 'user-b', tournamentRegistrationId: 'reg-b', teamLabel: 'A' },
            { userId: 'user-c', tournamentRegistrationId: 'reg-c', teamLabel: 'B' },
            { userId: 'user-d', tournamentRegistrationId: 'reg-d', teamLabel: 'B' },
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
      scheduleKey: 'round_robin:v1:reg-a,reg-b:single',
      payload: {
        rounds: [{ roundNumber: 1, matches: [{ matchNumber: 1, playerA: 'reg-a', playerB: 'reg-b' }] }],
      },
      createdAt: new Date(),
      updatedAt: new Date(),
    });
    mockTournamentRegistrationRepository.listByTournamentIdSV.mockResolvedValue(AUTH_REGISTRATIONS);
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

  it('resolves a GUEST registration to userId=null + tournamentRegistrationId set (mixed auth/guest match)', async () => {
    mockTournamentScheduleRepository.findByTournamentIdSV.mockResolvedValue({
      id: 'schedule-3',
      tournamentId: 'tournament-1',
      formatCode: 'ROUND_ROBIN',
      scheduleKey: 'round_robin:v1:reg-a,reg-guest-1:single',
      payload: {
        rounds: [{ roundNumber: 1, matches: [{ matchNumber: 1, playerA: 'reg-a', playerB: 'reg-guest-1' }] }],
      },
      createdAt: new Date(),
      updatedAt: new Date(),
    });
    mockTournamentRegistrationRepository.listByTournamentIdSV.mockResolvedValue([
      ...AUTH_REGISTRATIONS,
      { id: 'reg-guest-1', tournamentId: 'tournament-1', userId: null, status: 'CONFIRMED', createdAt: new Date() },
    ]);
    mockMaterializationRepository.transitionAndMaterializeSV.mockResolvedValue({
      created: true,
      matchCount: 1,
      tournament: { id: 'tournament-1', name: 'Torneo Demo', status: 'IN_PROGRESS' },
    });

    await useCase.executeSV(BASE_INPUT);

    expect(mockMaterializationRepository.transitionAndMaterializeSV).toHaveBeenCalledWith(
      expect.objectContaining({
        matches: [
          expect.objectContaining({
            participants: [
              { userId: 'user-a', tournamentRegistrationId: 'reg-a', teamLabel: null },
              { userId: null, tournamentRegistrationId: 'reg-guest-1', teamLabel: null },
            ],
          }),
        ],
      }),
    );
  });

  it('throws 409 CALENDARIO_OBSOLETO when a schedule token does not resolve to any known registration (stale pre-Slice-1 schedule)', async () => {
    mockTournamentScheduleRepository.findByTournamentIdSV.mockResolvedValue({
      id: 'schedule-4',
      tournamentId: 'tournament-1',
      formatCode: 'ROUND_ROBIN',
      scheduleKey: 'round_robin:v1:user-a,user-b:single',
      // Payload legado: tokens de `userId` (pre Slice-1), no `registrationId` — ninguno de
      // estos ids existe como TournamentRegistration.id en el roster actual.
      payload: {
        rounds: [{ roundNumber: 1, matches: [{ matchNumber: 1, playerA: 'user-a', playerB: 'user-b' }] }],
      },
      createdAt: new Date(),
      updatedAt: new Date(),
    });
    mockTournamentRegistrationRepository.listByTournamentIdSV.mockResolvedValue(AUTH_REGISTRATIONS);

    await expect(useCase.executeSV(BASE_INPUT)).rejects.toMatchObject({
      code: 'CALENDARIO_OBSOLETO',
      statusCode: 409,
    });
    expect(mockMaterializationRepository.transitionAndMaterializeSV).not.toHaveBeenCalled();
  });
});
