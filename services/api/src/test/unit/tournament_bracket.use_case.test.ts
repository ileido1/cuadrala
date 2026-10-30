import { describe, it, expect, vi } from 'vitest';
import { AssertTournamentOrganizerAccessUseCase } from '../../application/use_cases/assert_tournament_organizer_access.use_case.js';
import { AssertTournamentViewAccessUseCase } from '../../application/use_cases/assert_tournament_view_access.use_case.js';
import { GetTournamentBracketUseCase } from '../../application/use_cases/get_tournament_bracket.use_case.js';
import { generateGroupsPlusKnockoutScheduleSV } from '../../domain/groups_plus_knockout/groups_plus_knockout_schedule_generator.js';
import type { GroupsPlusKnockoutScheduleDTO } from '../../domain/groups_plus_knockout/groups_plus_knockout_schedule_generator.js';

// Mock tournament query repository
const mockTournamentQueryRepository = {
  listTournamentsSV: vi.fn(),
  getTournamentByIdSV: vi.fn(),
  listTournamentRegistrationsSV: vi.fn(),
  listTournamentsByVenueSV: vi.fn(),
  listViewerTournamentsSV: vi.fn(),
};

// Mock match repository (for resolving match IDs)
const mockMatchRepository = {
  findByIdSV: vi.fn(),
  createMatchSV: vi.fn(),
  updateMatchSV: vi.fn(),
  cancelMatchSV: vi.fn(),
};

// Mock schedule repository (S8b: whether a schedule was ever generated)
const mockTournamentScheduleRepository = {
  findByTournamentIdSV: vi.fn(),
  createOrValidateIdempotencySV: vi.fn(),
  saveSlotPlanSV: vi.fn(),
  updatePayloadSV: vi.fn(),
};

// Mock match-result repository (S8b: real per-match state once materialized)
const mockTournamentMatchResultRepository = {
  getVenueIdForTournamentSV: vi.fn(),
  matchBelongsToTournamentSV: vi.fn(),
  matchHasResultSV: vi.fn(),
  registerResultAndAdvanceSV: vi.fn(),
  listMatchParticipantSidesSV: vi.fn(),
  listTournamentMatchStatesSV: vi.fn(),
};

// Stub de acceso: los tests de esta suite son todos sobre torneos sin
// `visibility` declarado (tratado como PUBLIC) salvo el describe dedicado a
// PRIVATE más abajo, que compone la regla real con sus propios mocks.
const ALLOW_VIEW_ACCESS = { executeSV: vi.fn().mockResolvedValue(undefined) };

const useCase = new GetTournamentBracketUseCase(
  mockTournamentQueryRepository,
  mockMatchRepository,
  mockTournamentScheduleRepository,
  mockTournamentMatchResultRepository,
  ALLOW_VIEW_ACCESS as never,
);

//? Por defecto ningún torneo tiene calendario generado: los tests existentes
//? (preview pura) no deben cambiar de comportamiento. Los tests de S8b
//? pisan este mock puntualmente con `mockResolvedValueOnce`.
mockTournamentScheduleRepository.findByTournamentIdSV.mockResolvedValue(null);

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

describe('GetTournamentBracketUseCase — real match state once a schedule exists (S8b)', () => {
  const BASE_TOURNAMENT = {
    id: 'tournament-real',
    name: 'Torneo Real State',
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
  };

  const FOUR_REGISTRATIONS = [
    { id: 'reg-1', userId: 'user-1', userName: 'Jugador 1', status: 'CONFIRMED', createdAt: '2026-01-01T00:00:00.000Z' },
    { id: 'reg-2', userId: 'user-2', userName: 'Jugador 2', status: 'CONFIRMED', createdAt: '2026-01-01T00:00:01.000Z' },
    { id: 'reg-3', userId: 'user-3', userName: 'Jugador 3', status: 'CONFIRMED', createdAt: '2026-01-01T00:00:02.000Z' },
    { id: 'reg-4', userId: 'user-4', userName: 'Jugador 4', status: 'CONFIRMED', createdAt: '2026-01-01T00:00:03.000Z' },
  ];

  it('keeps the preview shape (winnerId/score/matchId null, status PENDING) when no schedule was ever generated', async () => {
    mockTournamentQueryRepository.getTournamentByIdSV.mockResolvedValue(BASE_TOURNAMENT);
    mockTournamentQueryRepository.listTournamentRegistrationsSV.mockResolvedValue(FOUR_REGISTRATIONS);
    mockTournamentScheduleRepository.findByTournamentIdSV.mockResolvedValueOnce(null);

    const result = await useCase.executeSV({ tournamentId: 'tournament-real' });

    for (const round of result.rounds) {
      for (const match of round.matches) {
        expect(match.winnerId).toBeNull();
        expect(match.score).toBeNull();
        expect(match.matchId).toBeNull();
        expect(match.status).toBe('PENDING');
      }
    }
    expect(mockTournamentMatchResultRepository.listTournamentMatchStatesSV).not.toHaveBeenCalled();
  });

  it('overlays real winnerId/score/status/matchId onto a completed match once the schedule and its result exist', async () => {
    mockTournamentQueryRepository.getTournamentByIdSV.mockResolvedValue(BASE_TOURNAMENT);
    mockTournamentQueryRepository.listTournamentRegistrationsSV.mockResolvedValue(FOUR_REGISTRATIONS);
    mockTournamentScheduleRepository.findByTournamentIdSV.mockResolvedValueOnce({
      id: 'schedule-1',
      tournamentId: 'tournament-real',
      formatCode: 'SINGLE_ELIMINATION',
      scheduleKey: 'schedule-key-real',
      payload: {},
      slotPlan: null,
      createdAt: new Date('2026-01-01T00:00:00.000Z'),
      updatedAt: new Date('2026-01-01T00:00:00.000Z'),
    });
    mockTournamentMatchResultRepository.listTournamentMatchStatesSV.mockResolvedValueOnce([
      {
        roundNumber: 1,
        matchNumber: 1,
        matchId: 'match-sf1',
        matchStatus: 'FINISHED',
        sides: [
          { sideKey: 'user-1', userIds: ['user-1'] },
          { sideKey: 'user-2', userIds: ['user-2'] },
        ],
        scores: [
          { userId: 'user-1', points: 6 },
          { userId: 'user-2', points: 2 },
        ],
      },
    ]);

    const result = await useCase.executeSV({ tournamentId: 'tournament-real' });

    expect(mockTournamentMatchResultRepository.listTournamentMatchStatesSV).toHaveBeenCalledWith({
      tournamentId: 'tournament-real',
      scheduleKey: 'schedule-key-real',
    });

    const ROUND_1 = result.rounds.find((_r) => _r.roundNumber === 1)!;
    const PLAYED_MATCH = ROUND_1.matches.find((_m) => _m.matchNumber === 1)!;
    expect(PLAYED_MATCH.matchId).toBe('match-sf1');
    expect(PLAYED_MATCH.status).toBe('COMPLETED');
    expect(PLAYED_MATCH.winnerId).toBe('user-1');
    expect(PLAYED_MATCH.score).toEqual([
      { userId: 'user-1', points: 6 },
      { userId: 'user-2', points: 2 },
    ]);

    // La otra semifinal de la misma ronda no tiene Match materializado todavía: preview intacto.
    const OTHER_MATCH = ROUND_1.matches.find((_m) => _m.matchNumber !== 1)!;
    expect(OTHER_MATCH.matchId).toBeNull();
    expect(OTHER_MATCH.status).toBe('PENDING');
    expect(OTHER_MATCH.winnerId).toBeNull();
    expect(OTHER_MATCH.score).toBeNull();
  });

  it('maps a materialized match with no recorded result yet to IN_PROGRESS with a real matchId but no winner', async () => {
    mockTournamentQueryRepository.getTournamentByIdSV.mockResolvedValue(BASE_TOURNAMENT);
    mockTournamentQueryRepository.listTournamentRegistrationsSV.mockResolvedValue(FOUR_REGISTRATIONS);
    mockTournamentScheduleRepository.findByTournamentIdSV.mockResolvedValueOnce({
      id: 'schedule-2',
      tournamentId: 'tournament-real',
      formatCode: 'SINGLE_ELIMINATION',
      scheduleKey: 'schedule-key-live',
      payload: {},
      slotPlan: null,
      createdAt: new Date('2026-01-01T00:00:00.000Z'),
      updatedAt: new Date('2026-01-01T00:00:00.000Z'),
    });
    mockTournamentMatchResultRepository.listTournamentMatchStatesSV.mockResolvedValueOnce([
      {
        roundNumber: 1,
        matchNumber: 1,
        matchId: 'match-live',
        matchStatus: 'IN_PROGRESS',
        sides: [
          { sideKey: 'user-1', userIds: ['user-1'] },
          { sideKey: 'user-2', userIds: ['user-2'] },
        ],
        scores: [],
      },
    ]);

    const result = await useCase.executeSV({ tournamentId: 'tournament-real' });

    const MATCH = result.rounds[0]!.matches.find((_m) => _m.matchNumber === 1)!;
    expect(MATCH.matchId).toBe('match-live');
    expect(MATCH.status).toBe('IN_PROGRESS');
    expect(MATCH.winnerId).toBeNull();
    expect(MATCH.score).toBeNull();
  });
});

//? Cierra #75: el bracket de un torneo PRIVATE solo puede verlo organizador,
//? staff de la sede, o un participante con inscripción activa. Compone la
//? regla real (no el stub ALLOW_VIEW_ACCESS de arriba) con sus propios mocks
//? de sede/inscripción.
describe('GetTournamentBracketUseCase — visibility PRIVATE (#75)', () => {
  const PRIVATE_TOURNAMENT = {
    id: 'tournament-private',
    name: 'Torneo Privado',
    status: 'IN_PROGRESS',
    sportId: 'sport-uuid',
    sportName: 'Padel',
    categoryId: 'cat-uuid',
    categoryName: 'Masculino',
    startsAt: '2026-06-01T00:00:00.000Z',
    registrationCount: 2,
    maxParticipants: 2,
    formatPresetId: 'preset-uuid',
    formatPresetName: 'SINGLE_ELIMINATION',
    presetSchemaVersion: 1,
    formatParameters: null,
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
    visibility: 'PRIVATE' as const,
    organizerUserId: 'organizer-1',
    venueId: null,
  };

  const TWO_REGISTRATIONS = [
    { id: 'reg-1', userId: 'user-1', userName: 'Jugador 1', status: 'CONFIRMED', createdAt: '2026-01-01T00:00:00.000Z' },
    { id: 'reg-2', userId: 'user-2', userName: 'Jugador 2', status: 'CONFIRMED', createdAt: '2026-01-01T00:00:01.000Z' },
  ];

  const venueStaffRepository = { isUserStaffOfVenueSV: vi.fn().mockResolvedValue(false) };
  const registrationRepository = { findByTournamentAndUserSV: vi.fn().mockResolvedValue(null) };
  const assertOrganizerAccess = new AssertTournamentOrganizerAccessUseCase(
    venueStaffRepository as never,
  );
  const assertViewAccess = new AssertTournamentViewAccessUseCase(
    assertOrganizerAccess,
    registrationRepository as never,
  );

  function buildPrivateUseCase() {
    const tournamentQueryRepository = {
      listTournamentsSV: vi.fn(),
      getTournamentByIdSV: vi.fn().mockResolvedValue(PRIVATE_TOURNAMENT),
      listTournamentRegistrationsSV: vi.fn().mockResolvedValue(TWO_REGISTRATIONS),
      listTournamentsByVenueSV: vi.fn(),
      listViewerTournamentsSV: vi.fn(),
    };
    const scheduleRepository = {
      findByTournamentIdSV: vi.fn().mockResolvedValue(null),
      createOrValidateIdempotencySV: vi.fn(),
      saveSlotPlanSV: vi.fn(),
      updatePayloadSV: vi.fn(),
    };
    const matchResultRepository = {
      getVenueIdForTournamentSV: vi.fn(),
      matchBelongsToTournamentSV: vi.fn(),
      matchHasResultSV: vi.fn(),
      registerResultAndAdvanceSV: vi.fn(),
      listMatchParticipantSidesSV: vi.fn(),
      listTournamentMatchStatesSV: vi.fn(),
    };
    return new GetTournamentBracketUseCase(
      tournamentQueryRepository as never,
      mockMatchRepository,
      scheduleRepository as never,
      matchResultRepository as never,
      assertViewAccess,
    );
  }

  it('should reject with a 401 AppError when there is no session', async () => {
    const privateUseCase = buildPrivateUseCase();

    await expect(
      privateUseCase.executeSV({ tournamentId: 'tournament-private' }),
    ).rejects.toMatchObject({ statusCode: 401, code: 'NO_AUTORIZADO' });
  });

  it('should reject with a 403 AppError for an outsider actor', async () => {
    venueStaffRepository.isUserStaffOfVenueSV.mockResolvedValueOnce(false);
    registrationRepository.findByTournamentAndUserSV.mockResolvedValueOnce(null);
    const privateUseCase = buildPrivateUseCase();

    await expect(
      privateUseCase.executeSV({ tournamentId: 'tournament-private', actorUserId: 'outsider-1' }),
    ).rejects.toMatchObject({ statusCode: 403, code: 'NO_AUTORIZADO' });
  });

  it('should resolve for the tournament organizer', async () => {
    const privateUseCase = buildPrivateUseCase();

    const RESULT = await privateUseCase.executeSV({
      tournamentId: 'tournament-private',
      actorUserId: 'organizer-1',
    });

    expect(RESULT.tournamentId).toBe('tournament-private');
  });

  it('should resolve for a participant with an active registration', async () => {
    registrationRepository.findByTournamentAndUserSV.mockResolvedValueOnce({
      id: 'reg-1',
      status: 'CONFIRMED',
    });
    const privateUseCase = buildPrivateUseCase();

    const RESULT = await privateUseCase.executeSV({
      tournamentId: 'tournament-private',
      actorUserId: 'user-1',
    });

    expect(RESULT.tournamentId).toBe('tournament-private');
  });
});

//? Issue #81 (S1-S3): GROUPS_PLUS_KNOCKOUT solo expone bracket una vez que
//? `AdvanceGroupsPlusKnockoutUseCase` resolvió semifinales (ver
//? groups_plus_knockout_transition_resolver.ts:174-182). Antes de eso, el
//? error debe ser distinto de 'FORMATO_NO_SOPORTADO' (ese mensaje es
//? engañoso para este formato, que sí tiene bracket conceptualmente).
describe('GetTournamentBracketUseCase — GROUPS_PLUS_KNOCKOUT (#81, S1-S3)', () => {
  const GPK_TOURNAMENT = {
    id: 'tournament-gpk',
    name: 'Torneo Grupos + Knockout',
    status: 'IN_PROGRESS',
    sportId: 'sport-uuid',
    sportName: 'Padel',
    categoryId: 'cat-uuid',
    categoryName: 'Masculino',
    startsAt: '2026-06-01T00:00:00.000Z',
    registrationCount: 4,
    maxParticipants: 4,
    formatPresetId: 'preset-uuid',
    formatPresetName: 'GROUPS_PLUS_KNOCKOUT',
    presetSchemaVersion: 1,
    formatParameters: null,
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
  };

  const GPK_REGISTRATIONS = [
    { id: 'reg-1', userId: 'user-1', userName: 'Jugador 1', status: 'CONFIRMED', createdAt: '2026-01-01T00:00:00.000Z' },
    { id: 'reg-2', userId: 'user-2', userName: 'Jugador 2', status: 'CONFIRMED', createdAt: '2026-01-01T00:00:01.000Z' },
    { id: 'reg-3', userId: 'user-3', userName: 'Jugador 3', status: 'CONFIRMED', createdAt: '2026-01-01T00:00:02.000Z' },
    { id: 'reg-4', userId: 'user-4', userName: 'Jugador 4', status: 'CONFIRMED', createdAt: '2026-01-01T00:00:03.000Z' },
  ];

  // Payload real producido por el generador de dominio: grupos armados,
  // semifinales/final sin jugadores resueltos todavía (igual que al generar
  // el calendario por primera vez, antes de cualquier avance de fase).
  const UNRESOLVED_PAYLOAD: GroupsPlusKnockoutScheduleDTO = generateGroupsPlusKnockoutScheduleSV({
    participantRegistrationIds: ['reg-1', 'reg-2', 'reg-3', 'reg-4'],
  });

  // Simula lo que `AdvanceGroupsPlusKnockoutUseCase._materializeSemifinalsSV`
  // deja en el payload una vez resueltas las semifinales
  // (groups_plus_knockout_transition_resolver.ts:174-182 exige playerA/playerB
  // no nulos en la ronda de semifinales para considerarla resuelta). La Final
  // queda intencionalmente sin resolver (S3: no se inventan ganadores).
  const RESOLVED_PAYLOAD: GroupsPlusKnockoutScheduleDTO = {
    ...UNRESOLVED_PAYLOAD,
    rounds: UNRESOLVED_PAYLOAD.rounds.map((_round) =>
      _round.roundNumber === UNRESOLVED_PAYLOAD.knockout.semifinalRoundNumber
        ? {
            ..._round,
            matches: [
              { ..._round.matches[0]!, playerA: 'reg-1', playerB: 'reg-4' },
              { ..._round.matches[1]!, playerA: 'reg-2', playerB: 'reg-3' },
            ],
          }
        : _round,
    ),
  };

  function buildGpkUseCase() {
    const tournamentQueryRepository = {
      listTournamentsSV: vi.fn(),
      getTournamentByIdSV: vi.fn().mockResolvedValue(GPK_TOURNAMENT),
      listTournamentRegistrationsSV: vi.fn().mockResolvedValue(GPK_REGISTRATIONS),
      listTournamentsByVenueSV: vi.fn(),
      listViewerTournamentsSV: vi.fn(),
    };
    const scheduleRepository = {
      findByTournamentIdSV: vi.fn(),
      createOrValidateIdempotencySV: vi.fn(),
      saveSlotPlanSV: vi.fn(),
      updatePayloadSV: vi.fn(),
    };
    const matchResultRepository = {
      getVenueIdForTournamentSV: vi.fn(),
      matchBelongsToTournamentSV: vi.fn(),
      matchHasResultSV: vi.fn(),
      registerResultAndAdvanceSV: vi.fn(),
      listMatchParticipantSidesSV: vi.fn(),
      listTournamentMatchStatesSV: vi.fn().mockResolvedValue([]),
    };
    const allowViewAccess = { executeSV: vi.fn().mockResolvedValue(undefined) };
    const gpkUseCase = new GetTournamentBracketUseCase(
      tournamentQueryRepository as never,
      mockMatchRepository,
      scheduleRepository as never,
      matchResultRepository as never,
      allowViewAccess as never,
    );
    return { gpkUseCase, scheduleRepository, matchResultRepository };
  }

  // S1: happy path — semifinales ya resueltas, debe devolver el DTO de 2
  // rondas construido desde el payload real, no desde generateSingleEliminationScheduleSV.
  it('returns a 2-round bracket DTO from the stored payload once semifinals are materialized', async () => {
    const { gpkUseCase, scheduleRepository } = buildGpkUseCase();
    scheduleRepository.findByTournamentIdSV.mockResolvedValue({
      id: 'schedule-gpk',
      tournamentId: 'tournament-gpk',
      formatCode: 'GROUPS_PLUS_KNOCKOUT',
      scheduleKey: 'gpk-schedule-key',
      payload: RESOLVED_PAYLOAD,
      slotPlan: null,
      createdAt: new Date('2026-01-01T00:00:00.000Z'),
      updatedAt: new Date('2026-01-01T00:00:00.000Z'),
    });

    const result = await gpkUseCase.executeSV({ tournamentId: 'tournament-gpk' });

    expect(result.tournamentId).toBe('tournament-gpk');
    expect(result.tournamentName).toBe('Torneo Grupos + Knockout');
    expect(result.totalRounds).toBe(2);
    expect(result.bracketSize).toBe(4);
    expect(result.rounds).toHaveLength(2);

    const SEMIFINALS = result.rounds[0]!;
    expect(SEMIFINALS.name).toBe('Semifinales');
    expect(SEMIFINALS.matches).toHaveLength(2);
    expect(SEMIFINALS.matches[0]!.playerA?.registrationId).toBe('reg-1');
    expect(SEMIFINALS.matches[0]!.playerA?.displayName).toBe('Jugador 1');
    expect(SEMIFINALS.matches[0]!.playerB?.registrationId).toBe('reg-4');
    expect(SEMIFINALS.matches[1]!.playerA?.registrationId).toBe('reg-2');
    expect(SEMIFINALS.matches[1]!.playerB?.registrationId).toBe('reg-3');

    const FINAL = result.rounds[1]!;
    expect(FINAL.name).toBe('Final');
    expect(FINAL.matches).toHaveLength(1);
    // S3: la Final puede (y debe) mostrarse como TBD mientras nadie propague
    // los ganadores de semifinales — no se inventan jugadores.
    expect(FINAL.matches[0]!.playerA).toBeNull();
    expect(FINAL.matches[0]!.playerB).toBeNull();
    expect(FINAL.matches[0]!.status).toBe('PENDING');
  });

  // S2: calendario guardado pero semifinales sin resolver todavía -> error
  // distinto y preciso, no el mensaje de SINGLE_ELIMINATION.
  it('throws CUADRO_NO_GENERADO when the schedule exists but the knockout phase is not materialized yet', async () => {
    const { gpkUseCase, scheduleRepository } = buildGpkUseCase();
    scheduleRepository.findByTournamentIdSV.mockResolvedValue({
      id: 'schedule-gpk-pending',
      tournamentId: 'tournament-gpk',
      formatCode: 'GROUPS_PLUS_KNOCKOUT',
      scheduleKey: 'gpk-schedule-key-pending',
      payload: UNRESOLVED_PAYLOAD,
      slotPlan: null,
      createdAt: new Date('2026-01-01T00:00:00.000Z'),
      updatedAt: new Date('2026-01-01T00:00:00.000Z'),
    });

    await expect(gpkUseCase.executeSV({ tournamentId: 'tournament-gpk' })).rejects.toMatchObject({
      code: 'CUADRO_NO_GENERADO',
      statusCode: 400,
      message: 'El cuadro final todavía no fue generado para este torneo.',
    });
  });

  // S2: ningún calendario guardado todavía -> mismo error, no 'SCHEDULE_NO_ENCONTRADO'
  // ni el 'FORMATO_NO_SOPORTADO' de SINGLE_ELIMINATION.
  it('throws CUADRO_NO_GENERADO when no schedule was ever stored for the tournament', async () => {
    const { gpkUseCase, scheduleRepository } = buildGpkUseCase();
    scheduleRepository.findByTournamentIdSV.mockResolvedValue(null);

    await expect(gpkUseCase.executeSV({ tournamentId: 'tournament-gpk' })).rejects.toMatchObject({
      code: 'CUADRO_NO_GENERADO',
      statusCode: 400,
      message: 'El cuadro final todavía no fue generado para este torneo.',
    });
  });
});

//? Regresión (#81): todo formato que no sea SINGLE_ELIMINATION ni
//? GROUPS_PLUS_KNOCKOUT debe seguir rechazándose con el 'FORMATO_NO_SOPORTADO'
//? genérico, sin cambios. No ensanchar esa rama.
describe('GetTournamentBracketUseCase — other formats keep FORMATO_NO_SOPORTADO unchanged (#81 regression)', () => {
  it.each(['ROUND_ROBIN', 'AMERICANO'])(
    'should throw FORMATO_NO_SOPORTADO for %s',
    async (formatPresetName) => {
      const tournamentQueryRepository = {
        listTournamentsSV: vi.fn(),
        getTournamentByIdSV: vi.fn().mockResolvedValue({
          id: `tournament-${formatPresetName}`,
          name: `Torneo ${formatPresetName}`,
          status: 'IN_PROGRESS',
          sportId: 'sport-uuid',
          sportName: 'Padel',
          categoryId: 'cat-uuid',
          categoryName: 'Masculino',
          startsAt: '2026-06-01T00:00:00.000Z',
          registrationCount: 4,
          maxParticipants: 4,
          formatPresetId: 'preset-uuid',
          formatPresetName,
          presetSchemaVersion: 1,
          formatParameters: null,
          createdAt: '2026-01-01T00:00:00.000Z',
          updatedAt: '2026-01-01T00:00:00.000Z',
        }),
        listTournamentRegistrationsSV: vi.fn().mockResolvedValue([
          { id: 'reg-1', userId: 'user-1', userName: 'Jugador 1', status: 'CONFIRMED', createdAt: '2026-01-01T00:00:00.000Z' },
          { id: 'reg-2', userId: 'user-2', userName: 'Jugador 2', status: 'CONFIRMED', createdAt: '2026-01-01T00:00:01.000Z' },
        ]),
        listTournamentsByVenueSV: vi.fn(),
        listViewerTournamentsSV: vi.fn(),
      };
      const scheduleRepository = {
        findByTournamentIdSV: vi.fn().mockResolvedValue(null),
        createOrValidateIdempotencySV: vi.fn(),
        saveSlotPlanSV: vi.fn(),
        updatePayloadSV: vi.fn(),
      };
      const matchResultRepository = {
        getVenueIdForTournamentSV: vi.fn(),
        matchBelongsToTournamentSV: vi.fn(),
        matchHasResultSV: vi.fn(),
        registerResultAndAdvanceSV: vi.fn(),
        listMatchParticipantSidesSV: vi.fn(),
        listTournamentMatchStatesSV: vi.fn(),
      };
      const allowViewAccess = { executeSV: vi.fn().mockResolvedValue(undefined) };
      const regressionUseCase = new GetTournamentBracketUseCase(
        tournamentQueryRepository as never,
        mockMatchRepository,
        scheduleRepository as never,
        matchResultRepository as never,
        allowViewAccess as never,
      );

      await expect(
        regressionUseCase.executeSV({ tournamentId: `tournament-${formatPresetName}` }),
      ).rejects.toMatchObject({
        code: 'FORMATO_NO_SOPORTADO',
        statusCode: 400,
        message: 'Bracket disponible solo para torneos SINGLE_ELIMINATION.',
      });
    },
  );
});
