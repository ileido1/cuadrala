import { beforeEach, describe, expect, it, vi } from 'vitest';

import { RegisterViaTournamentInviteLinkUseCase } from '../../application/use_cases/register_via_tournament_invite_link.use_case.js';

const mockInviteLinkRepository = {
  findByTokenHashSV: vi.fn(),
  incrementUsesCountSV: vi.fn(),
};

const mockTournamentRepository = {
  findByIdSV: vi.fn(),
};

const mockRegistrationRepository = {
  setInviteLinkIdSV: vi.fn(),
  countByTournamentIdSV: vi.fn(),
  createGuestSV: vi.fn(),
};

const mockRegisterTournamentParticipant = {
  executeSV: vi.fn(),
};

const useCase = new RegisterViaTournamentInviteLinkUseCase(
  mockInviteLinkRepository as never,
  mockTournamentRepository as never,
  mockRegistrationRepository as never,
  mockRegisterTournamentParticipant as never,
);

const VALID_LINK = {
  id: 'link-1',
  tournamentId: 'tournament-1',
  createdByUserId: 'organizer-1',
  expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
  maxUses: null,
  usesCount: 0,
  revokedAt: null,
  createdAt: new Date(),
};

const BASE_TOURNAMENT = {
  id: 'tournament-1',
  name: 'Torneo Demo',
  sportId: 'sport-1',
  categoryId: 'category-1',
  status: 'OPEN',
  isCompetitive: false,
  inscriptionPrice: null,
  maxSlots: null,
  organizerUserId: 'organizer-1',
  venueId: null,
};

const AUTHENTICATED_REGISTRATION = {
  id: 'reg-1',
  tournamentId: 'tournament-1',
  userId: 'player-1',
  userName: 'Player One',
  status: 'PENDING',
  registrationType: 'AUTHENTICATED',
  guestName: null,
  guestPhone: null,
  guestEmail: null,
  registeredByUserId: null,
  partnerRegistrationId: null,
  createdAt: new Date(),
};

const GUEST_REGISTRATION = {
  id: 'reg-2',
  tournamentId: 'tournament-1',
  userId: null,
  userName: null,
  status: 'PENDING',
  registrationType: 'GUEST',
  guestName: 'Juan Pérez',
  guestPhone: null,
  guestEmail: 'juan@mail.com',
  registeredByUserId: 'organizer-1',
  partnerRegistrationId: null,
  createdAt: new Date(),
};

beforeEach(() => {
  vi.clearAllMocks();
  mockInviteLinkRepository.findByTokenHashSV.mockResolvedValue(VALID_LINK);
  mockTournamentRepository.findByIdSV.mockResolvedValue(BASE_TOURNAMENT);
  mockInviteLinkRepository.incrementUsesCountSV.mockResolvedValue(undefined);
  mockRegistrationRepository.setInviteLinkIdSV.mockResolvedValue(undefined);
  mockRegistrationRepository.countByTournamentIdSV.mockResolvedValue(0);
  mockRegistrationRepository.createGuestSV.mockResolvedValue(GUEST_REGISTRATION);
  mockRegisterTournamentParticipant.executeSV.mockResolvedValue({
    created: true,
    registration: AUTHENTICATED_REGISTRATION,
  });
});

describe('RegisterViaTournamentInviteLinkUseCase — AUTHENTICATED branch (REQ-TIL-007)', () => {
  it('should delegate on RegisterTournamentParticipantUseCase, increment usesCount and attribute the link when created === true', async () => {
    const RESULT = await useCase.executeSV({
      token: 'raw-token-abc',
      actorUserId: 'player-1',
      guestInput: null,
    });

    expect(mockRegisterTournamentParticipant.executeSV).toHaveBeenCalledWith({
      tournamentId: 'tournament-1',
      userId: 'player-1',
    });
    expect(mockInviteLinkRepository.incrementUsesCountSV).toHaveBeenCalledWith('link-1');
    expect(mockRegistrationRepository.setInviteLinkIdSV).toHaveBeenCalledWith('reg-1', 'link-1');
    expect(RESULT).toEqual({
      registrationId: 'reg-1',
      registrationType: 'AUTHENTICATED',
      tournamentId: 'tournament-1',
      status: 'PENDING',
    });
  });

  it('should be idempotent on retry: when created === false it must not increment usesCount nor attribute the link again', async () => {
    mockRegisterTournamentParticipant.executeSV.mockResolvedValue({
      created: false,
      registration: AUTHENTICATED_REGISTRATION,
    });

    const RESULT = await useCase.executeSV({
      token: 'raw-token-abc',
      actorUserId: 'player-1',
      guestInput: null,
    });

    expect(mockInviteLinkRepository.incrementUsesCountSV).not.toHaveBeenCalled();
    expect(mockRegistrationRepository.setInviteLinkIdSV).not.toHaveBeenCalled();
    expect(RESULT.registrationId).toBe('reg-1');
  });
});

describe('RegisterViaTournamentInviteLinkUseCase — GUEST branch (REQ-TIL-008)', () => {
  it('should register a guest with registeredByUserId = link.createdByUserId and always increment usesCount (no idempotency)', async () => {
    const RESULT = await useCase.executeSV({
      token: 'raw-token-abc',
      actorUserId: null,
      guestInput: { name: 'Juan Pérez', email: 'juan@mail.com' },
    });

    expect(mockRegistrationRepository.createGuestSV).toHaveBeenCalledWith(
      expect.objectContaining({
        tournamentId: 'tournament-1',
        guestName: 'Juan Pérez',
        guestEmail: 'juan@mail.com',
        registeredByUserId: 'organizer-1',
        inviteLinkId: 'link-1',
      }),
    );
    expect(mockInviteLinkRepository.incrementUsesCountSV).toHaveBeenCalledWith('link-1');
    expect(mockRegistrationRepository.setInviteLinkIdSV).not.toHaveBeenCalled();
    expect(RESULT).toEqual({
      registrationId: 'reg-2',
      registrationType: 'GUEST',
      tournamentId: 'tournament-1',
      status: 'PENDING',
    });
  });

  it('should always increment usesCount on a second guest registration through the same link (GUEST never dedupes)', async () => {
    await useCase.executeSV({
      token: 'raw-token-abc',
      actorUserId: null,
      guestInput: { name: 'Juan Pérez', email: 'juan@mail.com' },
    });
    await useCase.executeSV({
      token: 'raw-token-abc',
      actorUserId: null,
      guestInput: { name: 'Otra Persona', email: 'otra@mail.com' },
    });

    expect(mockInviteLinkRepository.incrementUsesCountSV).toHaveBeenCalledTimes(2);
  });

  it('should throw 404 TORNEO_NO_ENCONTRADO when the tournament behind the link no longer exists', async () => {
    mockTournamentRepository.findByIdSV.mockResolvedValue(null);

    await expect(
      useCase.executeSV({
        token: 'raw-token-abc',
        actorUserId: null,
        guestInput: { name: 'Juan Pérez', email: 'juan@mail.com' },
      }),
    ).rejects.toMatchObject({ code: 'TORNEO_NO_ENCONTRADO', statusCode: 404 });

    expect(mockRegistrationRepository.createGuestSV).not.toHaveBeenCalled();
  });

  it('should throw 409 TORNEO_CERRADO reusing the roster-open window check (REQ-TIL-009), without creating a registration', async () => {
    mockTournamentRepository.findByIdSV.mockResolvedValue({ ...BASE_TOURNAMENT, status: 'IN_PROGRESS' });

    await expect(
      useCase.executeSV({
        token: 'raw-token-abc',
        actorUserId: null,
        guestInput: { name: 'Juan Pérez', email: 'juan@mail.com' },
      }),
    ).rejects.toMatchObject({ code: 'TORNEO_CERRADO', statusCode: 409 });

    expect(mockRegistrationRepository.createGuestSV).not.toHaveBeenCalled();
    expect(mockInviteLinkRepository.incrementUsesCountSV).not.toHaveBeenCalled();
  });

  it('should throw 409 CUPOS_AGOTADOS reusing the maxSlots check (REQ-TIL-010)', async () => {
    mockTournamentRepository.findByIdSV.mockResolvedValue({ ...BASE_TOURNAMENT, maxSlots: 16 });
    mockRegistrationRepository.countByTournamentIdSV.mockResolvedValue(16);

    await expect(
      useCase.executeSV({
        token: 'raw-token-abc',
        actorUserId: null,
        guestInput: { name: 'Juan Pérez', email: 'juan@mail.com' },
      }),
    ).rejects.toMatchObject({ code: 'CUPOS_AGOTADOS', statusCode: 409 });

    expect(mockRegistrationRepository.createGuestSV).not.toHaveBeenCalled();
  });
});

describe('RegisterViaTournamentInviteLinkUseCase — link validity (REQ-TIL-003/004/005)', () => {
  it('should throw 410 ENLACE_INVALIDO when the link is expired, before touching AUTHENTICATED or GUEST logic', async () => {
    mockInviteLinkRepository.findByTokenHashSV.mockResolvedValue({
      ...VALID_LINK,
      expiresAt: new Date(Date.now() - 1000),
    });

    await expect(
      useCase.executeSV({ token: 'raw-token-abc', actorUserId: 'player-1', guestInput: null }),
    ).rejects.toMatchObject({ code: 'ENLACE_INVALIDO', statusCode: 410 });

    expect(mockRegisterTournamentParticipant.executeSV).not.toHaveBeenCalled();
  });

  it('should throw 409 ENLACE_REVOCADO when the link was revoked', async () => {
    mockInviteLinkRepository.findByTokenHashSV.mockResolvedValue({ ...VALID_LINK, revokedAt: new Date() });

    await expect(
      useCase.executeSV({ token: 'raw-token-abc', actorUserId: 'player-1', guestInput: null }),
    ).rejects.toMatchObject({ code: 'ENLACE_REVOCADO', statusCode: 409 });
  });

  it('should throw 409 ENLACE_AGOTADO when the link exhausted its uses, without incrementing usesCount again', async () => {
    mockInviteLinkRepository.findByTokenHashSV.mockResolvedValue({ ...VALID_LINK, maxUses: 5, usesCount: 5 });

    await expect(
      useCase.executeSV({ token: 'raw-token-abc', actorUserId: 'player-1', guestInput: null }),
    ).rejects.toMatchObject({ code: 'ENLACE_AGOTADO', statusCode: 409 });

    expect(mockInviteLinkRepository.incrementUsesCountSV).not.toHaveBeenCalled();
  });

  it('should throw 410 ENLACE_INVALIDO when no link matches the token hash (fail-closed, no existence leak)', async () => {
    mockInviteLinkRepository.findByTokenHashSV.mockResolvedValue(null);

    await expect(
      useCase.executeSV({ token: 'raw-token-abc', actorUserId: 'player-1', guestInput: null }),
    ).rejects.toMatchObject({ code: 'ENLACE_INVALIDO', statusCode: 410 });
  });
});
