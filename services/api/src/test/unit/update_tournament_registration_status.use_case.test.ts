import { beforeEach, describe, expect, it, vi } from 'vitest';

import { UpdateTournamentRegistrationStatusUseCase } from '../../application/use_cases/update_tournament_registration_status.use_case.js';

const mockTournamentRepository = {
  findByIdSV: vi.fn(),
};

const mockRegistrationRepository = {
  findByIdSV: vi.fn(),
  updateStatusWithPartnerSV: vi.fn(),
};

const mockAssertTournamentOrganizerAccess = {
  executeSV: vi.fn(),
};

const mockCreateTournamentNotificationEvent = {
  executeSV: vi.fn(),
};

const useCase = new UpdateTournamentRegistrationStatusUseCase(
  mockTournamentRepository as never,
  mockRegistrationRepository as never,
  mockAssertTournamentOrganizerAccess as never,
  mockCreateTournamentNotificationEvent as never,
);

const BASE_TOURNAMENT = {
  id: 'tournament-1',
  name: 'Torneo Demo',
  sportId: 'sport-1',
  categoryId: 'category-1',
  formatPresetId: 'preset-1',
  presetSchemaVersion: 1,
  formatParameters: null,
  status: 'OPEN',
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

describe('UpdateTournamentRegistrationStatusUseCase', () => {
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
        status: 'CONFIRMED',
        actorUserId: 'organizer-1',
      }),
    ).rejects.toThrow('El torneo indicado no existe.');
  });

  it('should reject with 403 when the actor is neither the organizer nor venue staff', async () => {
    mockTournamentRepository.findByIdSV.mockResolvedValue(BASE_TOURNAMENT);
    mockAssertTournamentOrganizerAccess.executeSV.mockRejectedValue(new Error('403'));

    await expect(
      useCase.executeSV({
        tournamentId: 'tournament-1',
        registrationId: 'registration-1',
        status: 'CONFIRMED',
        actorUserId: 'random-player',
      }),
    ).rejects.toThrow();

    expect(mockRegistrationRepository.updateStatusWithPartnerSV).not.toHaveBeenCalled();
  });

  it('should reject with 409 once the tournament reaches IN_PROGRESS (roster lock)', async () => {
    mockTournamentRepository.findByIdSV.mockResolvedValue({
      ...BASE_TOURNAMENT,
      status: 'IN_PROGRESS',
    });

    await expect(
      useCase.executeSV({
        tournamentId: 'tournament-1',
        registrationId: 'registration-1',
        status: 'CONFIRMED',
        actorUserId: 'organizer-1',
      }),
    ).rejects.toMatchObject({ code: 'TORNEO_CERRADO', statusCode: 409 });

    expect(mockRegistrationRepository.updateStatusWithPartnerSV).not.toHaveBeenCalled();
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
        status: 'CONFIRMED',
        actorUserId: 'organizer-1',
      }),
    ).rejects.toMatchObject({ code: 'INSCRIPCION_NO_ENCONTRADA', statusCode: 404 });

    expect(mockRegistrationRepository.updateStatusWithPartnerSV).not.toHaveBeenCalled();
  });

  it('should confirm the registration and notify the player when the organizer approves it', async () => {
    mockTournamentRepository.findByIdSV.mockResolvedValue(BASE_TOURNAMENT);
    mockRegistrationRepository.findByIdSV.mockResolvedValue(BASE_REGISTRATION);
    const UPDATED = { ...BASE_REGISTRATION, status: 'CONFIRMED' };
    mockRegistrationRepository.updateStatusWithPartnerSV.mockResolvedValue(UPDATED);
    mockCreateTournamentNotificationEvent.executeSV.mockResolvedValue({
      eventId: 'event-1',
      createdDeliveries: 1,
    });

    const RESULT = await useCase.executeSV({
      tournamentId: 'tournament-1',
      registrationId: 'registration-1',
      status: 'CONFIRMED',
      actorUserId: 'organizer-1',
    });

    expect(mockRegistrationRepository.updateStatusWithPartnerSV).toHaveBeenCalledWith(
      'registration-1',
      'CONFIRMED',
    );
    expect(mockCreateTournamentNotificationEvent.executeSV).toHaveBeenCalledWith({
      type: 'TOURNAMENT_REGISTRATION_CONFIRMED',
      tournamentId: 'tournament-1',
      categoryId: 'category-1',
      payload: { tournamentName: 'Torneo Demo' },
      userIds: ['user-1'],
    });
    expect(RESULT).toEqual(UPDATED);
  });

  it('should throw INSCRIPCION_NO_ENCONTRADA when updateStatusWithPartnerSV returns null', async () => {
    mockTournamentRepository.findByIdSV.mockResolvedValue(BASE_TOURNAMENT);
    mockRegistrationRepository.findByIdSV.mockResolvedValue(BASE_REGISTRATION);
    mockRegistrationRepository.updateStatusWithPartnerSV.mockResolvedValue(null);

    await expect(
      useCase.executeSV({
        tournamentId: 'tournament-1',
        registrationId: 'registration-1',
        status: 'CONFIRMED',
        actorUserId: 'organizer-1',
      }),
    ).rejects.toMatchObject({ code: 'INSCRIPCION_NO_ENCONTRADA', statusCode: 404 });

    expect(mockCreateTournamentNotificationEvent.executeSV).not.toHaveBeenCalled();
  });

  it('should not notify when the registration has no linked user (GUEST)', async () => {
    mockTournamentRepository.findByIdSV.mockResolvedValue(BASE_TOURNAMENT);
    mockRegistrationRepository.findByIdSV.mockResolvedValue({
      ...BASE_REGISTRATION,
      userId: null,
      registrationType: 'GUEST',
    });
    mockRegistrationRepository.updateStatusWithPartnerSV.mockResolvedValue({
      ...BASE_REGISTRATION,
      userId: null,
      status: 'CONFIRMED',
    });

    await useCase.executeSV({
      tournamentId: 'tournament-1',
      registrationId: 'registration-1',
      status: 'CONFIRMED',
      actorUserId: 'organizer-1',
    });

    expect(mockCreateTournamentNotificationEvent.executeSV).not.toHaveBeenCalled();
  });

  it('should not fail the confirmation when the notification dispatch rejects', async () => {
    mockTournamentRepository.findByIdSV.mockResolvedValue(BASE_TOURNAMENT);
    mockRegistrationRepository.findByIdSV.mockResolvedValue(BASE_REGISTRATION);
    const UPDATED = { ...BASE_REGISTRATION, status: 'CONFIRMED' };
    mockRegistrationRepository.updateStatusWithPartnerSV.mockResolvedValue(UPDATED);
    mockCreateTournamentNotificationEvent.executeSV.mockRejectedValue(new Error('kafka down'));

    const RESULT = await useCase.executeSV({
      tournamentId: 'tournament-1',
      registrationId: 'registration-1',
      status: 'CONFIRMED',
      actorUserId: 'organizer-1',
    });

    expect(RESULT).toEqual(UPDATED);
  });
});
