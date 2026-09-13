import { describe, it, expect, vi } from 'vitest';
import { RegisterTournamentMatchResultUseCase } from '../../application/use_cases/register_tournament_match_result.use_case.js';

const mockTournamentQueryRepository = {
  listTournamentsSV: vi.fn(),
  getTournamentByIdSV: vi.fn(),
  listTournamentRegistrationsSV: vi.fn(),
  listTournamentsByVenueSV: vi.fn(),
  listViewerTournamentsSV: vi.fn(),
};

const mockAssertTournamentOrganizerAccess = {
  hasAccessSV: vi.fn(),
  executeSV: vi.fn(),
};

const mockTournamentMatchResultRepository = {
  getVenueIdForTournamentSV: vi.fn(),
  matchBelongsToTournamentSV: vi.fn(),
  registerResultSV: vi.fn(),
};

const useCase = new RegisterTournamentMatchResultUseCase(
  mockTournamentQueryRepository,
  mockAssertTournamentOrganizerAccess as never,
  mockTournamentMatchResultRepository,
);

const BASE_TOURNAMENT = {
  id: 'tournament-uuid',
  name: 'Torneo Test',
  status: 'IN_PROGRESS',
  organizerUserId: 'organizer-uuid',
  organizerName: 'Organizer',
  sportId: 'sport-uuid',
  sportName: 'Padel',
  categoryId: 'cat-uuid',
  categoryName: 'Masculino',
  startsAt: '2026-06-01T00:00:00.000Z',
  registrationCount: 4,
  venueId: 'venue-uuid',
  venueName: 'Venue Test',
  inscriptionPrice: null,
  maxSlots: null,
  registrationClosesAt: null,
  gender: null,
  formatPresetId: 'preset-uuid',
  formatPresetName: 'Single Elimination',
  presetSchemaVersion: 1,
  formatParameters: null,
  createdAt: '2026-01-01T00:00:00.000Z',
  updatedAt: '2026-01-01T00:00:00.000Z',
};

function resetMocksSV(): void {
  vi.clearAllMocks();
  mockTournamentQueryRepository.getTournamentByIdSV.mockResolvedValue(BASE_TOURNAMENT);
  mockTournamentMatchResultRepository.getVenueIdForTournamentSV.mockResolvedValue('venue-uuid');
  mockTournamentMatchResultRepository.matchBelongsToTournamentSV.mockResolvedValue(true);
  mockAssertTournamentOrganizerAccess.executeSV.mockResolvedValue(undefined);
}

describe('RegisterTournamentMatchResultUseCase', () => {
  it('should throw TORNEO_NO_ENCONTRADO when tournament does not exist', async () => {
    resetMocksSV();
    mockTournamentQueryRepository.getTournamentByIdSV.mockResolvedValue(null);

    await expect(
      useCase.executeSV({
        tournamentId: 'non-existent',
        matchId: 'match-uuid',
        matchNumber: 1,
        roundNumber: 1,
        scores: [{ userId: 'user-1', points: 6 }],
        requestingUserId: 'user-staff',
      }),
    ).rejects.toThrow('El torneo indicado no existe.');
  });

  it('should allow the tournament organizer (not venue staff) to record a result', async () => {
    resetMocksSV();
    mockTournamentMatchResultRepository.registerResultSV.mockResolvedValue({
      resultId: 'result-uuid',
      recordedAt: new Date('2026-01-01T00:00:00.000Z'),
    });

    const RESULT = await useCase.executeSV({
      tournamentId: 'tournament-uuid',
      matchId: 'match-uuid',
      matchNumber: 1,
      roundNumber: 1,
      scores: [{ userId: 'user-1', points: 6 }],
      requestingUserId: 'organizer-uuid',
    });

    expect(RESULT.resultId).toBe('result-uuid');
    expect(mockAssertTournamentOrganizerAccess.executeSV).toHaveBeenCalledWith({
      actorUserId: 'organizer-uuid',
      organizerUserId: 'organizer-uuid',
      venueId: 'venue-uuid',
      forbiddenMessage: 'No tienes permisos para editar este torneo.',
    });
    expect(mockTournamentMatchResultRepository.registerResultSV).toHaveBeenCalledWith({
      matchId: 'match-uuid',
      scores: [{ userId: 'user-1', points: 6 }],
    });
  });

  it('should allow venue staff to record a result', async () => {
    resetMocksSV();
    mockTournamentMatchResultRepository.registerResultSV.mockResolvedValue({
      resultId: 'result-uuid',
      recordedAt: new Date('2026-01-01T00:00:00.000Z'),
    });

    const RESULT = await useCase.executeSV({
      tournamentId: 'tournament-uuid',
      matchId: 'match-uuid',
      matchNumber: 1,
      roundNumber: 1,
      scores: [{ userId: 'user-1', points: 6 }],
      requestingUserId: 'staff-uuid',
    });

    expect(RESULT.resultId).toBe('result-uuid');
  });

  it('should propagate 403 when the requesting user is neither the organizer nor venue staff', async () => {
    resetMocksSV();
    const { AppError } = await import('../../domain/errors/app_error.js');
    mockAssertTournamentOrganizerAccess.executeSV.mockRejectedValue(
      new AppError('NO_AUTORIZADO', 'No tienes permisos para editar este torneo.', 403),
    );

    await expect(
      useCase.executeSV({
        tournamentId: 'tournament-uuid',
        matchId: 'match-uuid',
        matchNumber: 1,
        roundNumber: 1,
        scores: [{ userId: 'user-1', points: 6 }],
        requestingUserId: 'unrelated-user',
      }),
    ).rejects.toThrow('No tienes permisos para editar este torneo.');
    expect(mockTournamentMatchResultRepository.registerResultSV).not.toHaveBeenCalled();
  });

  it('should throw VALIDACION_FALLIDA when scores array is empty', async () => {
    resetMocksSV();

    await expect(
      useCase.executeSV({
        tournamentId: 'tournament-uuid',
        matchId: 'match-uuid',
        matchNumber: 1,
        roundNumber: 1,
        scores: [],
        requestingUserId: 'organizer-uuid',
      }),
    ).rejects.toThrow('Debe proporcionar al menos un resultado.');
  });

  it('should throw VALIDACION_FALLIDA when score has invalid points', async () => {
    resetMocksSV();

    await expect(
      useCase.executeSV({
        tournamentId: 'tournament-uuid',
        matchId: 'match-uuid',
        matchNumber: 1,
        roundNumber: 1,
        scores: [{ userId: 'user-1', points: -1 }],
        requestingUserId: 'organizer-uuid',
      }),
    ).rejects.toThrow('Cada score debe tener userId y points (número no negativo).');
  });
});
