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
  matchHasResultSV: vi.fn(),
  registerResultAndAdvanceSV: vi.fn(),
  listTournamentMatchStatesSV: vi.fn(),
  listMatchParticipantSidesSV: vi.fn(),
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
  mockTournamentMatchResultRepository.matchHasResultSV.mockResolvedValue(false);
  mockTournamentMatchResultRepository.listMatchParticipantSidesSV.mockResolvedValue([]);
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
    mockTournamentMatchResultRepository.registerResultAndAdvanceSV.mockResolvedValue({
      resultId: 'result-uuid',
      recordedAt: new Date('2026-01-01T00:00:00.000Z'),
      createdMatchIds: [],
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
    expect(mockTournamentMatchResultRepository.registerResultAndAdvanceSV).toHaveBeenCalledWith({
      matchId: 'match-uuid',
      scores: [{ userId: 'user-1', points: 6 }],
    });
  });

  it('should allow venue staff to record a result', async () => {
    resetMocksSV();
    mockTournamentMatchResultRepository.registerResultAndAdvanceSV.mockResolvedValue({
      resultId: 'result-uuid',
      recordedAt: new Date('2026-01-01T00:00:00.000Z'),
      createdMatchIds: [],
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

  it('should propagate a registerResultAndAdvanceSV rejection (simulated mid-transaction failure) without any further calls', async () => {
    resetMocksSV();
    mockTournamentMatchResultRepository.registerResultAndAdvanceSV.mockRejectedValue(
      new Error('conexión perdida a mitad de la transacción'),
    );

    await expect(
      useCase.executeSV({
        tournamentId: 'tournament-uuid',
        matchId: 'match-uuid',
        matchNumber: 1,
        roundNumber: 1,
        scores: [{ userId: 'user-1', points: 6 }],
        requestingUserId: 'organizer-uuid',
      }),
    ).rejects.toThrow('conexión perdida a mitad de la transacción');
    expect(mockTournamentMatchResultRepository.registerResultAndAdvanceSV).toHaveBeenCalledTimes(1);
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
    expect(mockTournamentMatchResultRepository.registerResultAndAdvanceSV).not.toHaveBeenCalled();
  });

  it('should throw RESULTADO_YA_CARGADO with 409 when the match already has a recorded result, writing nothing', async () => {
    resetMocksSV();
    mockTournamentMatchResultRepository.matchHasResultSV.mockResolvedValue(true);

    await expect(
      useCase.executeSV({
        tournamentId: 'tournament-uuid',
        matchId: 'match-uuid',
        matchNumber: 1,
        roundNumber: 1,
        scores: [{ userId: 'user-1', points: 6 }],
        requestingUserId: 'organizer-uuid',
      }),
    ).rejects.toMatchObject({ code: 'RESULTADO_YA_CARGADO', statusCode: 409 });
    expect(mockTournamentMatchResultRepository.registerResultAndAdvanceSV).not.toHaveBeenCalled();
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

  describe('single-elimination tie rejection (side aggregation, req. 4)', () => {
    const SINGLE_ELIMINATION_TOURNAMENT = {
      ...BASE_TOURNAMENT,
      formatPresetName: 'SINGLE_ELIMINATION',
    };

    it('should reject a doubles tie determined by side sum, not by the highest individual row', async () => {
      resetMocksSV();
      mockTournamentQueryRepository.getTournamentByIdSV.mockResolvedValue(
        SINGLE_ELIMINATION_TOURNAMENT,
      );
      //? Lado A = [15,15] (suma 30) vs lado B = [20,10] (suma 30): empate por lado,
      //? aunque la fila individual más alta (20) sea del lado B.
      mockTournamentMatchResultRepository.listMatchParticipantSidesSV.mockResolvedValue([
        { userId: 'a1', teamLabel: 'team-a' },
        { userId: 'a2', teamLabel: 'team-a' },
        { userId: 'b1', teamLabel: 'team-b' },
        { userId: 'b2', teamLabel: 'team-b' },
      ]);

      await expect(
        useCase.executeSV({
          tournamentId: 'tournament-uuid',
          matchId: 'match-uuid',
          matchNumber: 1,
          roundNumber: 1,
          scores: [
            { userId: 'a1', points: 15 },
            { userId: 'a2', points: 15 },
            { userId: 'b1', points: 20 },
            { userId: 'b2', points: 10 },
          ],
          requestingUserId: 'organizer-uuid',
        }),
      ).rejects.toMatchObject({ code: 'VALIDACION_FALLIDA', statusCode: 400 });
      expect(mockTournamentMatchResultRepository.registerResultAndAdvanceSV).not.toHaveBeenCalled();
    });

    it('should declare the doubles side with the higher sum the winner even when it holds no single highest row', async () => {
      resetMocksSV();
      mockTournamentQueryRepository.getTournamentByIdSV.mockResolvedValue(
        SINGLE_ELIMINATION_TOURNAMENT,
      );
      mockTournamentMatchResultRepository.listMatchParticipantSidesSV.mockResolvedValue([
        { userId: 'a1', teamLabel: 'team-a' },
        { userId: 'a2', teamLabel: 'team-a' },
        { userId: 'b1', teamLabel: 'team-b' },
        { userId: 'b2', teamLabel: 'team-b' },
      ]);
      mockTournamentMatchResultRepository.registerResultAndAdvanceSV.mockResolvedValue({
        resultId: 'result-uuid',
        recordedAt: new Date('2026-01-01T00:00:00.000Z'),
        createdMatchIds: [],
      });

      //? Lado A = [10,9] (suma 19) vs lado B = [15,2] (suma 17): A gana pese a que
      //? B tiene la fila individual más alta (15).
      const RESULT = await useCase.executeSV({
        tournamentId: 'tournament-uuid',
        matchId: 'match-uuid',
        matchNumber: 1,
        roundNumber: 1,
        scores: [
          { userId: 'a1', points: 10 },
          { userId: 'a2', points: 9 },
          { userId: 'b1', points: 15 },
          { userId: 'b2', points: 2 },
        ],
        requestingUserId: 'organizer-uuid',
      });

      expect(RESULT.resultId).toBe('result-uuid');
      expect(mockTournamentMatchResultRepository.registerResultAndAdvanceSV).toHaveBeenCalled();
    });

    it('should reject a singles tie in single elimination', async () => {
      resetMocksSV();
      mockTournamentQueryRepository.getTournamentByIdSV.mockResolvedValue(
        SINGLE_ELIMINATION_TOURNAMENT,
      );
      mockTournamentMatchResultRepository.listMatchParticipantSidesSV.mockResolvedValue([
        { userId: 'user-1', teamLabel: null },
        { userId: 'user-2', teamLabel: null },
      ]);

      await expect(
        useCase.executeSV({
          tournamentId: 'tournament-uuid',
          matchId: 'match-uuid',
          matchNumber: 1,
          roundNumber: 1,
          scores: [
            { userId: 'user-1', points: 6 },
            { userId: 'user-2', points: 6 },
          ],
          requestingUserId: 'organizer-uuid',
        }),
      ).rejects.toMatchObject({ code: 'VALIDACION_FALLIDA', statusCode: 400 });
      expect(mockTournamentMatchResultRepository.registerResultAndAdvanceSV).not.toHaveBeenCalled();
    });

    it('should not check for ties outside single elimination (round robin accepts a tie)', async () => {
      resetMocksSV();
      mockTournamentQueryRepository.getTournamentByIdSV.mockResolvedValue({
        ...BASE_TOURNAMENT,
        formatPresetName: 'ROUND_ROBIN',
      });
      mockTournamentMatchResultRepository.registerResultAndAdvanceSV.mockResolvedValue({
        resultId: 'result-uuid',
        recordedAt: new Date('2026-01-01T00:00:00.000Z'),
        createdMatchIds: [],
      });

      const RESULT = await useCase.executeSV({
        tournamentId: 'tournament-uuid',
        matchId: 'match-uuid',
        matchNumber: 1,
        roundNumber: 1,
        scores: [
          { userId: 'user-1', points: 6 },
          { userId: 'user-2', points: 6 },
        ],
        requestingUserId: 'organizer-uuid',
      });

      expect(RESULT.resultId).toBe('result-uuid');
      expect(mockTournamentMatchResultRepository.listMatchParticipantSidesSV).not.toHaveBeenCalled();
    });
  });
});
