import { describe, it, expect, vi } from 'vitest';
import { GetTournamentBracketUseCase } from '../../application/use_cases/get_tournament_bracket.use_case.js';

// Mock tournament query repository
const mockTournamentQueryRepository = {
  listTournamentsSV: vi.fn(),
  getTournamentByIdSV: vi.fn(),
  listTournamentRegistrationsSV: vi.fn(),
  listTournamentsByVenueSV: vi.fn(),
};

// Mock match repository (for resolving match IDs)
const mockMatchRepository = {
  findByIdSV: vi.fn(),
  createMatchSV: vi.fn(),
  updateMatchSV: vi.fn(),
  cancelMatchSV: vi.fn(),
};

const useCase = new GetTournamentBracketUseCase(mockTournamentQueryRepository, mockMatchRepository);

describe('GetTournamentBracketUseCase', () => {
  it('should return bracket for tournament with 8 confirmed players', async () => {
    const userId1 = 'user-uuid-1';
    const userId2 = 'user-uuid-2';
    const userId3 = 'user-uuid-3';
    const userId4 = 'user-uuid-4';
    const userId5 = 'user-uuid-5';
    const userId6 = 'user-uuid-6';
    const userId7 = 'user-uuid-7';
    const userId8 = 'user-uuid-8';

    mockTournamentQueryRepository.getTournamentByIdSV.mockResolvedValue({
      id: 'tournament-uuid',
      name: 'Torneo 8 Jugadores',
      status: 'IN_PROGRESS',
      sportId: 'sport-uuid',
      sportName: 'Padel',
      categoryId: 'cat-uuid',
      categoryName: 'Masculino',
      startsAt: '2026-06-01T00:00:00.000Z',
      registrationCount: 8,
      maxParticipants: 8,
      formatPresetId: 'preset-uuid',
      formatPresetName: 'SINGLE_ELIMINATION',
      presetSchemaVersion: 1,
      formatParameters: null,
      createdAt: '2026-01-01T00:00:00.000Z',
      updatedAt: '2026-01-01T00:00:00.000Z',
    });

    mockTournamentQueryRepository.listTournamentRegistrationsSV.mockResolvedValue([
      { id: 'reg-1', userId: userId1, userName: 'Jugador 1', status: 'CONFIRMED', createdAt: '2026-01-01T00:00:00.000Z' },
      { id: 'reg-2', userId: userId2, userName: 'Jugador 2', status: 'CONFIRMED', createdAt: '2026-01-01T00:00:01.000Z' },
      { id: 'reg-3', userId: userId3, userName: 'Jugador 3', status: 'CONFIRMED', createdAt: '2026-01-01T00:00:02.000Z' },
      { id: 'reg-4', userId: userId4, userName: 'Jugador 4', status: 'CONFIRMED', createdAt: '2026-01-01T00:00:03.000Z' },
      { id: 'reg-5', userId: userId5, userName: 'Jugador 5', status: 'CONFIRMED', createdAt: '2026-01-01T00:00:04.000Z' },
      { id: 'reg-6', userId: userId6, userName: 'Jugador 6', status: 'CONFIRMED', createdAt: '2026-01-01T00:00:05.000Z' },
      { id: 'reg-7', userId: userId7, userName: 'Jugador 7', status: 'CONFIRMED', createdAt: '2026-01-01T00:00:06.000Z' },
      { id: 'reg-8', userId: userId8, userName: 'Jugador 8', status: 'CONFIRMED', createdAt: '2026-01-01T00:00:07.000Z' },
    ]);

    const result = await useCase.executeSV({ tournamentId: 'tournament-uuid' });

    expect(result.tournamentId).toBe('tournament-uuid');
    expect(result.tournamentName).toBe('Torneo 8 Jugadores');
    expect(result.totalRounds).toBe(3);
    expect(result.bracketSize).toBe(8);
    expect(result.rounds).toHaveLength(3);
    expect(result.rounds[0]!.matches).toHaveLength(4); // Octavos
    expect(result.rounds[1]!.matches).toHaveLength(2); // Cuartos
    expect(result.rounds[2]!.matches).toHaveLength(1); // Final
  });

  it('should return bracket for tournament with 4 players', async () => {
    mockTournamentQueryRepository.getTournamentByIdSV.mockResolvedValue({
      id: 'tournament-4',
      name: 'Torneo 4 Jugadores',
      status: 'IN_PROGRESS',
      sportId: 'sport-uuid',
      sportName: 'Padel',
      categoryId: 'cat-uuid',
      categoryName: 'Masculino',
      startsAt: '2026-06-01T00:00:00.000Z',
      registrationCount: 4,
      maxParticipants: 4,
      formatPresetId: 'preset-uuid',
      formatPresetName: 'SINGLE_ELIMINATION',
      presetSchemaVersion: 1,
      formatParameters: null,
      createdAt: '2026-01-01T00:00:00.000Z',
      updatedAt: '2026-01-01T00:00:00.000Z',
    });

    mockTournamentQueryRepository.listTournamentRegistrationsSV.mockResolvedValue([
      { id: 'reg-1', userId: 'user-1', userName: 'Jugador 1', status: 'CONFIRMED', createdAt: '2026-01-01T00:00:00.000Z' },
      { id: 'reg-2', userId: 'user-2', userName: 'Jugador 2', status: 'CONFIRMED', createdAt: '2026-01-01T00:00:01.000Z' },
      { id: 'reg-3', userId: 'user-3', userName: 'Jugador 3', status: 'CONFIRMED', createdAt: '2026-01-01T00:00:02.000Z' },
      { id: 'reg-4', userId: 'user-4', userName: 'Jugador 4', status: 'CONFIRMED', createdAt: '2026-01-01T00:00:03.000Z' },
    ]);

    const result = await useCase.executeSV({ tournamentId: 'tournament-4' });

    expect(result.totalRounds).toBe(2);
    expect(result.bracketSize).toBe(4);
    expect(result.rounds).toHaveLength(2);
    expect(result.rounds[0]!.matches).toHaveLength(2); // Semifinal
    expect(result.rounds[1]!.matches).toHaveLength(1); // Final
  });

  it('should handle bye distribution for 5 players', async () => {
    mockTournamentQueryRepository.getTournamentByIdSV.mockResolvedValue({
      id: 'tournament-5',
      name: 'Torneo 5 Jugadores',
      status: 'IN_PROGRESS',
      sportId: 'sport-uuid',
      sportName: 'Padel',
      categoryId: 'cat-uuid',
      categoryName: 'Masculino',
      startsAt: '2026-06-01T00:00:00.000Z',
      registrationCount: 5,
      maxParticipants: 8,
      formatPresetId: 'preset-uuid',
      formatPresetName: 'SINGLE_ELIMINATION',
      presetSchemaVersion: 1,
      formatParameters: null,
      createdAt: '2026-01-01T00:00:00.000Z',
      updatedAt: '2026-01-01T00:00:00.000Z',
    });

    mockTournamentQueryRepository.listTournamentRegistrationsSV.mockResolvedValue([
      { id: 'reg-1', userId: 'user-1', userName: 'Jugador 1', status: 'CONFIRMED', createdAt: '2026-01-01T00:00:00.000Z' },
      { id: 'reg-2', userId: 'user-2', userName: 'Jugador 2', status: 'CONFIRMED', createdAt: '2026-01-01T00:00:01.000Z' },
      { id: 'reg-3', userId: 'user-3', userName: 'Jugador 3', status: 'CONFIRMED', createdAt: '2026-01-01T00:00:02.000Z' },
      { id: 'reg-4', userId: 'user-4', userName: 'Jugador 4', status: 'CONFIRMED', createdAt: '2026-01-01T00:00:03.000Z' },
      { id: 'reg-5', userId: 'user-5', userName: 'Jugador 5', status: 'CONFIRMED', createdAt: '2026-01-01T00:00:04.000Z' },
    ]);

    const result = await useCase.executeSV({ tournamentId: 'tournament-5' });

    expect(result.bracketSize).toBe(8);
    expect(result.totalRounds).toBe(3);
    expect(result.rounds[0]!.matches).toHaveLength(4); // 8 positions / 2 = 4 matches
  });

  it('should throw TORNEO_NO_ENCONTRADO when tournament does not exist', async () => {
    mockTournamentQueryRepository.getTournamentByIdSV.mockResolvedValue(null);

    await expect(
      useCase.executeSV({ tournamentId: 'non-existent' })
    ).rejects.toThrow('El torneo indicado no existe.');
  });

  it('should throw VALIDACION_FALLIDA for non-SINGLE_ELIMINATION format', async () => {
    mockTournamentQueryRepository.getTournamentByIdSV.mockResolvedValue({
      id: 'tournament-americano',
      name: 'Torneo Americano',
      status: 'IN_PROGRESS',
      sportId: 'sport-uuid',
      sportName: 'Padel',
      categoryId: 'cat-uuid',
      categoryName: 'Masculino',
      startsAt: '2026-06-01T00:00:00.000Z',
      registrationCount: 4,
      maxParticipants: 4,
      formatPresetId: 'preset-uuid',
      formatPresetName: 'Americano',
      presetSchemaVersion: 1,
      formatParameters: null,
      createdAt: '2026-01-01T00:00:00.000Z',
      updatedAt: '2026-01-01T00:00:00.000Z',
    });

    mockTournamentQueryRepository.listTournamentRegistrationsSV.mockResolvedValue([
      { id: 'reg-1', userId: 'user-1', userName: 'Jugador 1', status: 'CONFIRMED', createdAt: '2026-01-01T00:00:00.000Z' },
      { id: 'reg-2', userId: 'user-2', userName: 'Jugador 2', status: 'CONFIRMED', createdAt: '2026-01-01T00:00:01.000Z' },
      { id: 'reg-3', userId: 'user-3', userName: 'Jugador 3', status: 'CONFIRMED', createdAt: '2026-01-01T00:00:02.000Z' },
      { id: 'reg-4', userId: 'user-4', userName: 'Jugador 4', status: 'CONFIRMED', createdAt: '2026-01-01T00:00:03.000Z' },
    ]);

    await expect(
      useCase.executeSV({ tournamentId: 'tournament-americano' })
    ).rejects.toThrow('Bracket disponible solo para torneos SINGLE_ELIMINATION.');
  });

  it('should throw error when fewer than 2 confirmed registrations', async () => {
    mockTournamentQueryRepository.getTournamentByIdSV.mockResolvedValue({
      id: 'tournament-insufficient',
      name: 'Torneo Insuficiente',
      status: 'OPEN',
      sportId: 'sport-uuid',
      sportName: 'Padel',
      categoryId: 'cat-uuid',
      categoryName: 'Masculino',
      startsAt: '2026-06-01T00:00:00.000Z',
      registrationCount: 1,
      maxParticipants: 8,
      formatPresetId: 'preset-uuid',
      formatPresetName: 'SINGLE_ELIMINATION',
      presetSchemaVersion: 1,
      formatParameters: null,
      createdAt: '2026-01-01T00:00:00.000Z',
      updatedAt: '2026-01-01T00:00:00.000Z',
    });

    mockTournamentQueryRepository.listTournamentRegistrationsSV.mockResolvedValue([
      { id: 'reg-1', userId: 'user-1', userName: 'Jugador 1', status: 'CONFIRMED', createdAt: '2026-01-01T00:00:00.000Z' },
    ]);

    await expect(
      useCase.executeSV({ tournamentId: 'tournament-insufficient' })
    ).rejects.toThrow('Se requieren al menos 2 participantes confirmados para SINGLE_ELIMINATION.');
  });
});
