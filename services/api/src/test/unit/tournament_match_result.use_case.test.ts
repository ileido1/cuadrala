import { describe, it, expect, vi } from 'vitest';
import { RegisterTournamentMatchResultUseCase } from '../../../application/use_cases/register_tournament_match_result.use_case';

// Mock repositories
const mockTournamentQueryRepository = {
  listTournamentsSV: vi.fn(),
  getTournamentByIdSV: vi.fn(),
  listTournamentRegistrationsSV: vi.fn(),
  listTournamentsByVenueSV: vi.fn(),
};

const mockVenueStaffRepository = {
  upsertSV: vi.fn(),
  findByVenueAndUserSV: vi.fn(),
  listByVenueIdSV: vi.fn(),
  listByUserIdSV: vi.fn(),
  removeByVenueAndUserSV: vi.fn(),
  isUserStaffOfVenueSV: vi.fn(),
};

const mockMatchCrudRepository = {
  findByIdSV: vi.fn(),
  createMatchSV: vi.fn(),
  updateMatchSV: vi.fn(),
  cancelMatchSV: vi.fn(),
};

const useCase = new RegisterTournamentMatchResultUseCase(
  mockTournamentQueryRepository,
  mockVenueStaffRepository,
  mockMatchCrudRepository,
);

describe('RegisterTournamentMatchResultUseCase', () => {
  it('should throw TORNEO_NO_ENCONTRADO when tournament does not exist', async () => {
    mockTournamentQueryRepository.getTournamentByIdSV.mockResolvedValue(null);

    await expect(
      useCase.executeSV({
        tournamentId: 'non-existent',
        matchId: 'match-uuid',
        matchNumber: 1,
        roundNumber: 1,
        scores: [{ userId: 'user-1', points: 6 }],
        requestingUserId: 'user-staff',
      })
    ).rejects.toThrow('El torneo indicado no existe.');
  });

  it('should throw ACCESO_DENEGADO when user is not staff of venue', async () => {
    mockTournamentQueryRepository.getTournamentByIdSV.mockResolvedValue({
      id: 'tournament-uuid',
      name: 'Torneo Test',
      status: 'IN_PROGRESS',
      sportId: 'sport-uuid',
      sportName: 'Padel',
      categoryId: 'cat-uuid',
      categoryName: 'Masculino',
      startsAt: '2026-06-01T00:00:00.000Z',
      registrationCount: 4,
      maxParticipants: 4,
      formatPresetId: 'preset-uuid',
      formatPresetName: 'Single Elimination',
      presetSchemaVersion: 1,
      formatParameters: null,
      createdAt: '2026-01-01T00:00:00.000Z',
      updatedAt: '2026-01-01T00:00:00.000Z',
    });

    mockVenueStaffRepository.isUserStaffOfVenueSV.mockResolvedValue(false);

    await expect(
      useCase.executeSV({
        tournamentId: 'tournament-uuid',
        matchId: 'match-uuid',
        matchNumber: 1,
        roundNumber: 1,
        scores: [{ userId: 'user-1', points: 6 }],
        requestingUserId: 'non-staff-user',
      })
    ).rejects.toThrow('No tienes permisos para editar este torneo.');
  });

  it('should throw VALIDACION_FALLIDA when scores array is empty', async () => {
    mockTournamentQueryRepository.getTournamentByIdSV.mockResolvedValue({
      id: 'tournament-uuid',
      name: 'Torneo Test',
      status: 'IN_PROGRESS',
      sportId: 'sport-uuid',
      sportName: 'Padel',
      categoryId: 'cat-uuid',
      categoryName: 'Masculino',
      startsAt: '2026-06-01T00:00:00.000Z',
      registrationCount: 4,
      maxParticipants: 4,
      formatPresetId: 'preset-uuid',
      formatPresetName: 'Single Elimination',
      presetSchemaVersion: 1,
      formatParameters: null,
      createdAt: '2026-01-01T00:00:00.000Z',
      updatedAt: '2026-01-01T00:00:00.000Z',
    });

    mockVenueStaffRepository.isUserStaffOfVenueSV.mockResolvedValue(true);

    await expect(
      useCase.executeSV({
        tournamentId: 'tournament-uuid',
        matchId: 'match-uuid',
        matchNumber: 1,
        roundNumber: 1,
        scores: [],
        requestingUserId: 'user-staff',
      })
    ).rejects.toThrow('Debe proporcionar al menos un resultado.');
  });

  it('should throw VALIDACION_FALLIDA when score has invalid points', async () => {
    mockTournamentQueryRepository.getTournamentByIdSV.mockResolvedValue({
      id: 'tournament-uuid',
      name: 'Torneo Test',
      status: 'IN_PROGRESS',
      sportId: 'sport-uuid',
      sportName: 'Padel',
      categoryId: 'cat-uuid',
      categoryName: 'Masculino',
      startsAt: '2026-06-01T00:00:00.000Z',
      registrationCount: 4,
      maxParticipants: 4,
      formatPresetId: 'preset-uuid',
      formatPresetName: 'Single Elimination',
      presetSchemaVersion: 1,
      formatParameters: null,
      createdAt: '2026-01-01T00:00:00.000Z',
      updatedAt: '2026-01-01T00:00:00.000Z',
    });

    mockVenueStaffRepository.isUserStaffOfVenueSV.mockResolvedValue(true);

    await expect(
      useCase.executeSV({
        tournamentId: 'tournament-uuid',
        matchId: 'match-uuid',
        matchNumber: 1,
        roundNumber: 1,
        scores: [{ userId: 'user-1', points: -1 }],
        requestingUserId: 'user-staff',
      })
    ).rejects.toThrow('Cada score debe tener userId y points (número no negativo).');
  });
});
