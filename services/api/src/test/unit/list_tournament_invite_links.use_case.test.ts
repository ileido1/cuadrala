import { beforeEach, describe, expect, it, vi } from 'vitest';

import { ListTournamentInviteLinksUseCase } from '../../application/use_cases/list_tournament_invite_links.use_case.js';

const mockTournamentRepository = {
  findByIdSV: vi.fn(),
};

const mockInviteLinkRepository = {
  listByTournamentIdWithRegistrantsSV: vi.fn(),
};

const mockAssertTournamentOrganizerAccess = {
  executeSV: vi.fn(),
};

const useCase = new ListTournamentInviteLinksUseCase(
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

const LINKS_WITH_REGISTRANTS = [
  {
    id: 'link-1',
    tournamentId: 'tournament-1',
    createdByUserId: 'organizer-1',
    expiresAt: new Date('2099-01-01T00:00:00.000Z'),
    maxUses: null,
    usesCount: 2,
    revokedAt: null,
    createdAt: new Date(),
    registrants: [
      {
        registrationId: 'reg-1',
        type: 'AUTHENTICATED',
        displayName: 'Juan Pérez',
        registeredAt: new Date(),
      },
      {
        registrationId: 'reg-2',
        type: 'GUEST',
        displayName: 'María López',
        registeredAt: new Date(),
      },
    ],
  },
];

beforeEach(() => {
  vi.clearAllMocks();
  mockTournamentRepository.findByIdSV.mockResolvedValue(BASE_TOURNAMENT);
  mockAssertTournamentOrganizerAccess.executeSV.mockResolvedValue(undefined);
  mockInviteLinkRepository.listByTournamentIdWithRegistrantsSV.mockResolvedValue(LINKS_WITH_REGISTRANTS);
});

describe('ListTournamentInviteLinksUseCase', () => {
  it('should return each link with its registrants[] and never expose token/tokenHash (REQ-TIL-006/002)', async () => {
    const RESULT = await useCase.executeSV({ tournamentId: 'tournament-1', actorUserId: 'organizer-1' });

    expect(RESULT).toHaveLength(1);
    expect(RESULT[0]?.registrants).toHaveLength(2);
    expect(RESULT[0]).not.toHaveProperty('token');
    expect(RESULT[0]).not.toHaveProperty('tokenHash');
    expect(mockInviteLinkRepository.listByTournamentIdWithRegistrantsSV).toHaveBeenCalledWith('tournament-1');
  });

  it('should throw 403 NO_AUTORIZADO when the actor has no organizer/staff access', async () => {
    mockAssertTournamentOrganizerAccess.executeSV.mockRejectedValue(
      Object.assign(new Error('No tienes permisos para administrar este torneo.'), {
        code: 'NO_AUTORIZADO',
        statusCode: 403,
      }),
    );

    await expect(
      useCase.executeSV({ tournamentId: 'tournament-1', actorUserId: 'intruder-1' }),
    ).rejects.toMatchObject({ code: 'NO_AUTORIZADO', statusCode: 403 });

    expect(mockInviteLinkRepository.listByTournamentIdWithRegistrantsSV).not.toHaveBeenCalled();
  });

  it('should throw 404 TORNEO_NO_ENCONTRADO when the tournament does not exist', async () => {
    mockTournamentRepository.findByIdSV.mockResolvedValue(null);

    await expect(
      useCase.executeSV({ tournamentId: 'missing-tournament', actorUserId: 'organizer-1' }),
    ).rejects.toMatchObject({ code: 'TORNEO_NO_ENCONTRADO', statusCode: 404 });
  });
});
