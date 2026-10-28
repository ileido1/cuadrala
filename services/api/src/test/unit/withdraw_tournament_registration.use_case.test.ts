import { beforeEach, describe, expect, it, vi } from 'vitest';

import { WithdrawTournamentRegistrationUseCase } from '../../application/use_cases/withdraw_tournament_registration.use_case.js';

const mockTournamentRepository = {
  findByIdSV: vi.fn(),
  createTournamentSV: vi.fn(),
  updateStatusSV: vi.fn(),
};

const mockRegistrationRepository = {
  disableByTournamentAndUserSV: vi.fn(),
};

const mockAssertTournamentOrganizerAccess = {
  executeSV: vi.fn(),
};

const useCase = new WithdrawTournamentRegistrationUseCase(
  mockTournamentRepository as never,
  mockRegistrationRepository as never,
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
  startsAt: null,
  organizerUserId: 'organizer-1',
  venueId: null,
  createdAt: new Date(),
  updatedAt: new Date(),
};

describe('WithdrawTournamentRegistrationUseCase', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockAssertTournamentOrganizerAccess.executeSV.mockResolvedValue(undefined);
  });

  it('should throw TORNEO_NO_ENCONTRADO when tournament does not exist', async () => {
    mockTournamentRepository.findByIdSV.mockResolvedValue(null);

    await expect(
      useCase.executeSV({ tournamentId: 'missing-tournament', userId: 'user-1', actorUserId: 'user-1' }),
    ).rejects.toThrow('El torneo indicado no existe.');
  });

  it('should reject the withdrawal with 409 once the tournament reaches IN_PROGRESS (roster lock)', async () => {
    mockTournamentRepository.findByIdSV.mockResolvedValue({
      ...BASE_TOURNAMENT,
      status: 'IN_PROGRESS',
    });

    await expect(
      useCase.executeSV({ tournamentId: 'tournament-1', userId: 'user-1', actorUserId: 'user-1' }),
    ).rejects.toMatchObject({
      code: 'TORNEO_CERRADO',
      statusCode: 409,
    });

    expect(mockRegistrationRepository.disableByTournamentAndUserSV).not.toHaveBeenCalled();
  });

  it('should withdraw the registration when the tournament is still DRAFT or OPEN', async () => {
    mockTournamentRepository.findByIdSV.mockResolvedValue({ ...BASE_TOURNAMENT, status: 'OPEN' });
    mockRegistrationRepository.disableByTournamentAndUserSV.mockResolvedValue(true);

    await useCase.executeSV({ tournamentId: 'tournament-1', userId: 'user-1', actorUserId: 'user-1' });

    expect(mockRegistrationRepository.disableByTournamentAndUserSV).toHaveBeenCalledWith(
      'tournament-1',
      'user-1',
    );
  });

  //? Baja propia: el jugador afectado no necesita pasar por el chequeo de organizador.
  it('should allow a player to withdraw their own registration without checking organizer access', async () => {
    mockTournamentRepository.findByIdSV.mockResolvedValue({ ...BASE_TOURNAMENT, status: 'OPEN' });
    mockRegistrationRepository.disableByTournamentAndUserSV.mockResolvedValue(true);

    await useCase.executeSV({ tournamentId: 'tournament-1', userId: 'user-1', actorUserId: 'user-1' });

    expect(mockAssertTournamentOrganizerAccess.executeSV).not.toHaveBeenCalled();
    expect(mockRegistrationRepository.disableByTournamentAndUserSV).toHaveBeenCalledWith(
      'tournament-1',
      'user-1',
    );
  });

  //? Baja de otro jugador por el organizador del torneo: permitido via
  //? AssertTournamentOrganizerAccessUseCase (la distincion organizador/staff
  //? se cubre en assert_tournament_organizer_access.use_case.test.ts).
  it('should allow the tournament organizer to withdraw another player', async () => {
    mockTournamentRepository.findByIdSV.mockResolvedValue({
      ...BASE_TOURNAMENT,
      status: 'OPEN',
      organizerUserId: 'organizer-1',
    });
    mockRegistrationRepository.disableByTournamentAndUserSV.mockResolvedValue(true);

    await useCase.executeSV({
      tournamentId: 'tournament-1',
      userId: 'user-1',
      actorUserId: 'organizer-1',
    });

    expect(mockAssertTournamentOrganizerAccess.executeSV).toHaveBeenCalledWith({
      actorUserId: 'organizer-1',
      organizerUserId: 'organizer-1',
      venueId: null,
    });
    expect(mockRegistrationRepository.disableByTournamentAndUserSV).toHaveBeenCalledWith(
      'tournament-1',
      'user-1',
    );
  });

  //? Baja de otro jugador por staff de la sede del torneo: permitido via
  //? AssertTournamentOrganizerAccessUseCase (no es el organizador registrado).
  it('should allow venue staff of the tournament to withdraw another player', async () => {
    mockTournamentRepository.findByIdSV.mockResolvedValue({
      ...BASE_TOURNAMENT,
      status: 'OPEN',
      organizerUserId: 'organizer-1',
      venueId: 'venue-1',
    });
    mockRegistrationRepository.disableByTournamentAndUserSV.mockResolvedValue(true);

    await useCase.executeSV({
      tournamentId: 'tournament-1',
      userId: 'user-1',
      actorUserId: 'staff-1',
    });

    expect(mockAssertTournamentOrganizerAccess.executeSV).toHaveBeenCalledWith({
      actorUserId: 'staff-1',
      organizerUserId: 'organizer-1',
      venueId: 'venue-1',
    });
    expect(mockRegistrationRepository.disableByTournamentAndUserSV).toHaveBeenCalledWith(
      'tournament-1',
      'user-1',
    );
  });

  it('should reject with 403 when a player who is neither the affected user, organizer nor venue staff tries to withdraw another player', async () => {
    mockTournamentRepository.findByIdSV.mockResolvedValue({
      ...BASE_TOURNAMENT,
      status: 'OPEN',
      organizerUserId: 'organizer-1',
    });
    mockAssertTournamentOrganizerAccess.executeSV.mockRejectedValue(new Error('403'));

    await expect(
      useCase.executeSV({
        tournamentId: 'tournament-1',
        userId: 'user-1',
        actorUserId: 'random-player',
      }),
    ).rejects.toThrow();

    expect(mockRegistrationRepository.disableByTournamentAndUserSV).not.toHaveBeenCalled();
  });
});
