import { beforeEach, describe, expect, it, vi } from 'vitest';

import { RemoveTournamentRegistrationUseCase } from '../../application/use_cases/remove_tournament_registration.use_case.js';

const mockTournamentRepository = {
  findByIdSV: vi.fn(),
};

const mockRegistrationRepository = {
  findByIdSV: vi.fn(),
  deleteByIdSV: vi.fn(),
};

const mockAssertTournamentOrganizerAccess = {
  executeSV: vi.fn(),
};

const useCase = new RemoveTournamentRegistrationUseCase(
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

const BASE_REGISTRATION = {
  id: 'registration-1',
  tournamentId: 'tournament-1',
  userId: 'user-1',
  userName: 'User One',
  status: 'PENDING',
  registrationType: 'AUTHENTICATED' as const,
  guestName: null,
  guestPhone: null,
  guestEmail: null,
  registeredByUserId: null,
  partnerRegistrationId: null,
  createdAt: new Date(),
};

describe('RemoveTournamentRegistrationUseCase', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockAssertTournamentOrganizerAccess.executeSV.mockResolvedValue(undefined);
  });

  it('should throw TORNEO_NO_ENCONTRADO when tournament does not exist', async () => {
    mockTournamentRepository.findByIdSV.mockResolvedValue(null);

    await expect(
      useCase.executeSV({
        tournamentId: 'missing-tournament',
        registrationId: 'registration-1',
        actorUserId: 'organizer-1',
      }),
    ).rejects.toThrow('El torneo indicado no existe.');

    expect(mockAssertTournamentOrganizerAccess.executeSV).not.toHaveBeenCalled();
  });

  it('should reject with 403 when the actor is neither the organizer nor venue staff', async () => {
    mockTournamentRepository.findByIdSV.mockResolvedValue(BASE_TOURNAMENT);
    mockAssertTournamentOrganizerAccess.executeSV.mockRejectedValue(new Error('403'));

    await expect(
      useCase.executeSV({
        tournamentId: 'tournament-1',
        registrationId: 'registration-1',
        actorUserId: 'random-player',
      }),
    ).rejects.toThrow();

    expect(mockAssertTournamentOrganizerAccess.executeSV).toHaveBeenCalledWith({
      actorUserId: 'random-player',
      organizerUserId: 'organizer-1',
      venueId: null,
    });
    expect(mockRegistrationRepository.deleteByIdSV).not.toHaveBeenCalled();
  });

  it('should throw INSCRIPCION_NO_ENCONTRADA when the registration does not exist', async () => {
    mockTournamentRepository.findByIdSV.mockResolvedValue(BASE_TOURNAMENT);
    mockRegistrationRepository.findByIdSV.mockResolvedValue(null);

    await expect(
      useCase.executeSV({
        tournamentId: 'tournament-1',
        registrationId: 'missing-registration',
        actorUserId: 'organizer-1',
      }),
    ).rejects.toThrow('La inscripción indicada no existe.');

    expect(mockRegistrationRepository.deleteByIdSV).not.toHaveBeenCalled();
  });

  it('should throw INSCRIPCION_NO_ENCONTRADA when the registration belongs to another tournament', async () => {
    mockTournamentRepository.findByIdSV.mockResolvedValue(BASE_TOURNAMENT);
    mockRegistrationRepository.findByIdSV.mockResolvedValue({
      ...BASE_REGISTRATION,
      tournamentId: 'other-tournament',
    });

    await expect(
      useCase.executeSV({
        tournamentId: 'tournament-1',
        registrationId: 'registration-1',
        actorUserId: 'organizer-1',
      }),
    ).rejects.toMatchObject({ code: 'INSCRIPCION_NO_ENCONTRADA', statusCode: 404 });

    expect(mockRegistrationRepository.deleteByIdSV).not.toHaveBeenCalled();
  });

  it('should reject with 409 once the tournament reaches IN_PROGRESS (roster lock)', async () => {
    mockTournamentRepository.findByIdSV.mockResolvedValue({
      ...BASE_TOURNAMENT,
      status: 'IN_PROGRESS',
    });
    mockRegistrationRepository.findByIdSV.mockResolvedValue(BASE_REGISTRATION);

    await expect(
      useCase.executeSV({
        tournamentId: 'tournament-1',
        registrationId: 'registration-1',
        actorUserId: 'organizer-1',
      }),
    ).rejects.toMatchObject({ code: 'TORNEO_CERRADO', statusCode: 409 });

    expect(mockRegistrationRepository.deleteByIdSV).not.toHaveBeenCalled();
  });

  it('should delete the registration when the organizer removes it while the tournament is DRAFT/OPEN', async () => {
    mockTournamentRepository.findByIdSV.mockResolvedValue({ ...BASE_TOURNAMENT, status: 'OPEN' });
    mockRegistrationRepository.findByIdSV.mockResolvedValue(BASE_REGISTRATION);
    mockRegistrationRepository.deleteByIdSV.mockResolvedValue(true);

    await useCase.executeSV({
      tournamentId: 'tournament-1',
      registrationId: 'registration-1',
      actorUserId: 'organizer-1',
    });

    expect(mockRegistrationRepository.deleteByIdSV).toHaveBeenCalledWith('registration-1');
  });

  //? Eliminación por staff de la sede del torneo: permitido vía
  //? AssertTournamentOrganizerAccessUseCase (no es el organizador registrado).
  it('should allow venue staff of the tournament to remove a registration', async () => {
    mockTournamentRepository.findByIdSV.mockResolvedValue({
      ...BASE_TOURNAMENT,
      status: 'DRAFT',
      venueId: 'venue-1',
    });
    mockRegistrationRepository.findByIdSV.mockResolvedValue(BASE_REGISTRATION);
    mockRegistrationRepository.deleteByIdSV.mockResolvedValue(true);

    await useCase.executeSV({
      tournamentId: 'tournament-1',
      registrationId: 'registration-1',
      actorUserId: 'staff-1',
    });

    expect(mockAssertTournamentOrganizerAccess.executeSV).toHaveBeenCalledWith({
      actorUserId: 'staff-1',
      organizerUserId: 'organizer-1',
      venueId: 'venue-1',
    });
    expect(mockRegistrationRepository.deleteByIdSV).toHaveBeenCalledWith('registration-1');
  });
});
