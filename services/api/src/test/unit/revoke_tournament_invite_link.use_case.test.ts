import { beforeEach, describe, expect, it, vi } from 'vitest';

import { RevokeTournamentInviteLinkUseCase } from '../../application/use_cases/revoke_tournament_invite_link.use_case.js';

const mockTournamentRepository = {
  findByIdSV: vi.fn(),
};

const mockInviteLinkRepository = {
  findByIdAndTournamentIdSV: vi.fn(),
  revokeSV: vi.fn(),
};

const mockAssertTournamentOrganizerAccess = {
  executeSV: vi.fn(),
};

const useCase = new RevokeTournamentInviteLinkUseCase(
  mockTournamentRepository as never,
  mockInviteLinkRepository as never,
  mockAssertTournamentOrganizerAccess as never,
);

const BASE_TOURNAMENT = {
  id: 'tournament-1',
  name: 'Torneo Demo',
  organizerUserId: 'organizer-1',
  venueId: null,
  status: 'OPEN',
};

const ACTIVE_LINK = {
  id: 'link-1',
  tournamentId: 'tournament-1',
  createdByUserId: 'organizer-1',
  expiresAt: new Date('2099-01-01T00:00:00.000Z'),
  maxUses: null,
  usesCount: 0,
  revokedAt: null,
  createdAt: new Date(),
};

beforeEach(() => {
  vi.clearAllMocks();
  mockTournamentRepository.findByIdSV.mockResolvedValue(BASE_TOURNAMENT);
  mockAssertTournamentOrganizerAccess.executeSV.mockResolvedValue(undefined);
  mockInviteLinkRepository.findByIdAndTournamentIdSV.mockResolvedValue(ACTIVE_LINK);
  mockInviteLinkRepository.revokeSV.mockResolvedValue(undefined);
});

describe('RevokeTournamentInviteLinkUseCase', () => {
  it('should revoke an active link (REQ-TIL-005)', async () => {
    await useCase.executeSV({ tournamentId: 'tournament-1', linkId: 'link-1', actorUserId: 'organizer-1' });

    expect(mockInviteLinkRepository.revokeSV).toHaveBeenCalledWith('link-1');
  });

  it('should be idempotent when revoking a link already revoked', async () => {
    mockInviteLinkRepository.findByIdAndTournamentIdSV.mockResolvedValue({
      ...ACTIVE_LINK,
      revokedAt: new Date('2026-01-01T00:00:00.000Z'),
    });

    await expect(
      useCase.executeSV({ tournamentId: 'tournament-1', linkId: 'link-1', actorUserId: 'organizer-1' }),
    ).resolves.toBeUndefined();

    expect(mockInviteLinkRepository.revokeSV).toHaveBeenCalledWith('link-1');
  });

  it('should throw 403 NO_AUTORIZADO when the actor has no organizer/staff access, without mutating the link', async () => {
    mockAssertTournamentOrganizerAccess.executeSV.mockRejectedValue(
      Object.assign(new Error('No tienes permisos para administrar este torneo.'), {
        code: 'NO_AUTORIZADO',
        statusCode: 403,
      }),
    );

    await expect(
      useCase.executeSV({ tournamentId: 'tournament-1', linkId: 'link-1', actorUserId: 'intruder-1' }),
    ).rejects.toMatchObject({ code: 'NO_AUTORIZADO', statusCode: 403 });

    expect(mockInviteLinkRepository.revokeSV).not.toHaveBeenCalled();
  });

  it('should throw 404 ENLACE_NO_ENCONTRADO (not TORNEO_NO_ENCONTRADO) when the tournament does not exist', async () => {
    mockTournamentRepository.findByIdSV.mockResolvedValue(null);

    await expect(
      useCase.executeSV({ tournamentId: 'missing-tournament', linkId: 'link-1', actorUserId: 'organizer-1' }),
    ).rejects.toMatchObject({ code: 'ENLACE_NO_ENCONTRADO', statusCode: 404 });

    expect(mockInviteLinkRepository.revokeSV).not.toHaveBeenCalled();
  });

  it('should throw 404 ENLACE_NO_ENCONTRADO when linkId belongs to another tournament (no cross-tournament existence leak)', async () => {
    mockInviteLinkRepository.findByIdAndTournamentIdSV.mockResolvedValue(null);

    await expect(
      useCase.executeSV({ tournamentId: 'tournament-1', linkId: 'other-tournament-link', actorUserId: 'organizer-1' }),
    ).rejects.toMatchObject({ code: 'ENLACE_NO_ENCONTRADO', statusCode: 404 });

    expect(mockInviteLinkRepository.revokeSV).not.toHaveBeenCalled();
  });
});
