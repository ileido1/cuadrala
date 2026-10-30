import { beforeEach, describe, expect, it, vi } from 'vitest';

import { CancelTournamentInvitationUseCase } from '../../application/use_cases/cancel_tournament_invitation.use_case.js';

const mockTournamentRepository = {
  findByIdSV: vi.fn(),
};

const mockInvitationRepository = {
  findByIdSV: vi.fn(),
  updateStatusSV: vi.fn(),
};

const mockAssertTournamentOrganizerAccess = {
  executeSV: vi.fn(),
};

const useCase = new CancelTournamentInvitationUseCase(
  mockTournamentRepository as never,
  mockInvitationRepository as never,
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
  status: 'OPEN',
  startsAt: null,
  organizerUserId: 'organizer-1',
  venueId: null,
  createdAt: new Date(),
  updatedAt: new Date(),
};

const BASE_INVITATION = {
  id: 'invitation-1',
  tournamentId: 'tournament-1',
  invitedUserId: 'user-2',
  invitedUserName: 'User Two',
  createdByUserId: 'organizer-1',
  status: 'PENDING',
  createdAt: new Date(),
  updatedAt: new Date(),
};

describe('CancelTournamentInvitationUseCase', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockAssertTournamentOrganizerAccess.executeSV.mockResolvedValue(undefined);
  });

  it('should throw TORNEO_NO_ENCONTRADO when tournament does not exist', async () => {
    mockTournamentRepository.findByIdSV.mockResolvedValue(null);

    await expect(
      useCase.executeSV({
        tournamentId: 'missing-tournament',
        invitationId: 'invitation-1',
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
        invitationId: 'invitation-1',
        actorUserId: 'random-player',
      }),
    ).rejects.toThrow();

    expect(mockAssertTournamentOrganizerAccess.executeSV).toHaveBeenCalledWith({
      actorUserId: 'random-player',
      organizerUserId: 'organizer-1',
      venueId: null,
    });
    expect(mockInvitationRepository.updateStatusSV).not.toHaveBeenCalled();
  });

  it('should throw INVITACION_NO_ENCONTRADA when the invitation does not exist', async () => {
    mockTournamentRepository.findByIdSV.mockResolvedValue(BASE_TOURNAMENT);
    mockInvitationRepository.findByIdSV.mockResolvedValue(null);

    await expect(
      useCase.executeSV({
        tournamentId: 'tournament-1',
        invitationId: 'missing-invitation',
        actorUserId: 'organizer-1',
      }),
    ).rejects.toThrow('La invitación indicada no existe.');

    expect(mockInvitationRepository.updateStatusSV).not.toHaveBeenCalled();
  });

  it('should throw INVITACION_NO_ENCONTRADA when the invitation belongs to another tournament', async () => {
    mockTournamentRepository.findByIdSV.mockResolvedValue(BASE_TOURNAMENT);
    mockInvitationRepository.findByIdSV.mockResolvedValue({
      ...BASE_INVITATION,
      tournamentId: 'other-tournament',
    });

    await expect(
      useCase.executeSV({
        tournamentId: 'tournament-1',
        invitationId: 'invitation-1',
        actorUserId: 'organizer-1',
      }),
    ).rejects.toMatchObject({ code: 'INVITACION_NO_ENCONTRADA', statusCode: 404 });

    expect(mockInvitationRepository.updateStatusSV).not.toHaveBeenCalled();
  });

  it('should reject with 409 once the tournament reaches IN_PROGRESS (roster lock)', async () => {
    mockTournamentRepository.findByIdSV.mockResolvedValue({
      ...BASE_TOURNAMENT,
      status: 'IN_PROGRESS',
    });
    mockInvitationRepository.findByIdSV.mockResolvedValue(BASE_INVITATION);

    await expect(
      useCase.executeSV({
        tournamentId: 'tournament-1',
        invitationId: 'invitation-1',
        actorUserId: 'organizer-1',
      }),
    ).rejects.toMatchObject({ code: 'TORNEO_CERRADO', statusCode: 409 });

    expect(mockInvitationRepository.updateStatusSV).not.toHaveBeenCalled();
  });

  it('should cancel the invitation when the organizer requests it while the tournament is DRAFT/OPEN', async () => {
    mockTournamentRepository.findByIdSV.mockResolvedValue(BASE_TOURNAMENT);
    mockInvitationRepository.findByIdSV.mockResolvedValue(BASE_INVITATION);
    mockInvitationRepository.updateStatusSV.mockResolvedValue({
      ...BASE_INVITATION,
      status: 'CANCELLED',
    });

    await useCase.executeSV({
      tournamentId: 'tournament-1',
      invitationId: 'invitation-1',
      actorUserId: 'organizer-1',
    });

    expect(mockInvitationRepository.updateStatusSV).toHaveBeenCalledWith('invitation-1', 'CANCELLED');
  });

  //? Cancelación por staff de la sede del torneo: permitido vía
  //? AssertTournamentOrganizerAccessUseCase (no es el organizador registrado).
  it('should allow venue staff of the tournament to cancel an invitation', async () => {
    mockTournamentRepository.findByIdSV.mockResolvedValue({
      ...BASE_TOURNAMENT,
      venueId: 'venue-1',
    });
    mockInvitationRepository.findByIdSV.mockResolvedValue(BASE_INVITATION);
    mockInvitationRepository.updateStatusSV.mockResolvedValue({
      ...BASE_INVITATION,
      status: 'CANCELLED',
    });

    await useCase.executeSV({
      tournamentId: 'tournament-1',
      invitationId: 'invitation-1',
      actorUserId: 'staff-1',
    });

    expect(mockAssertTournamentOrganizerAccess.executeSV).toHaveBeenCalledWith({
      actorUserId: 'staff-1',
      organizerUserId: 'organizer-1',
      venueId: 'venue-1',
    });
    expect(mockInvitationRepository.updateStatusSV).toHaveBeenCalledWith('invitation-1', 'CANCELLED');
  });
});
