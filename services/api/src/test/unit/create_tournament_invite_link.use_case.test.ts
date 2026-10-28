import { beforeEach, describe, expect, it, vi } from 'vitest';

import { CreateTournamentInviteLinkUseCase } from '../../application/use_cases/create_tournament_invite_link.use_case.js';

const mockTournamentRepository = {
  findByIdSV: vi.fn(),
};

const mockInviteLinkRepository = {
  createSV: vi.fn(),
};

const mockAssertTournamentOrganizerAccess = {
  executeSV: vi.fn(),
};

const PUBLIC_WEB_URL = 'https://cuadrala.app';

const useCase = new CreateTournamentInviteLinkUseCase(
  mockTournamentRepository as never,
  mockInviteLinkRepository as never,
  mockAssertTournamentOrganizerAccess as never,
  PUBLIC_WEB_URL,
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
  visibility: 'PUBLIC',
  startsAt: null,
  endsAt: null,
  organizerUserId: 'organizer-1',
  venueId: null,
  pairedRegistration: false,
  isCompetitive: false,
  inscriptionPrice: null,
  gender: null,
  maxSlots: null,
  registrationClosesAt: null,
  registrationCount: 0,
  hasSchedule: false,
  matchCount: 0,
  createdAt: new Date(),
  updatedAt: new Date(),
};

const CREATED_LINK = {
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
  mockInviteLinkRepository.createSV.mockImplementation(async (_input) =>
    Promise.resolve({ link: { ...CREATED_LINK, ..._input, maxUses: _input.maxUses }, token: 'raw-token-abc' }),
  );
});

describe('CreateTournamentInviteLinkUseCase', () => {
  it('should return the 201 shape with the raw token and the same url/deepLink (REQ-TIL-001/011)', async () => {
    const RESULT = await useCase.executeSV({ tournamentId: 'tournament-1', actorUserId: 'organizer-1' });

    expect(RESULT.id).toBe('link-1');
    expect(RESULT.token).toBe('raw-token-abc');
    expect(RESULT.url).toBe(`${PUBLIC_WEB_URL}/invite/raw-token-abc`);
    expect(RESULT.deepLink).toBe(RESULT.url);
    expect(RESULT.maxUses).toBeNull();
    expect(RESULT.usesCount).toBe(0);
    expect(RESULT.revokedAt).toBeNull();
    expect(RESULT.createdAt).toBeInstanceOf(Date);
  });

  it('should throw 403 NO_AUTORIZADO when the actor has no organizer/staff access, without creating a link', async () => {
    mockAssertTournamentOrganizerAccess.executeSV.mockRejectedValue(
      Object.assign(new Error('No tienes permisos para administrar este torneo.'), {
        code: 'NO_AUTORIZADO',
        statusCode: 403,
      }),
    );

    await expect(
      useCase.executeSV({ tournamentId: 'tournament-1', actorUserId: 'intruder-1' }),
    ).rejects.toMatchObject({ code: 'NO_AUTORIZADO', statusCode: 403 });

    expect(mockInviteLinkRepository.createSV).not.toHaveBeenCalled();
  });

  it('should throw 404 TORNEO_NO_ENCONTRADO when the tournament does not exist', async () => {
    mockTournamentRepository.findByIdSV.mockResolvedValue(null);

    await expect(
      useCase.executeSV({ tournamentId: 'missing-tournament', actorUserId: 'organizer-1' }),
    ).rejects.toMatchObject({ code: 'TORNEO_NO_ENCONTRADO', statusCode: 404 });

    expect(mockInviteLinkRepository.createSV).not.toHaveBeenCalled();
  });

  it('should default expiresAt to MIN(registrationClosesAt, startsAt) when both are future', async () => {
    const REGISTRATION_CLOSES_AT = new Date(Date.now() + 5 * 24 * 60 * 60 * 1000);
    const STARTS_AT = new Date(Date.now() + 10 * 24 * 60 * 60 * 1000);
    mockTournamentRepository.findByIdSV.mockResolvedValue({
      ...BASE_TOURNAMENT,
      registrationClosesAt: REGISTRATION_CLOSES_AT,
      startsAt: STARTS_AT,
    });

    await useCase.executeSV({ tournamentId: 'tournament-1', actorUserId: 'organizer-1' });

    expect(mockInviteLinkRepository.createSV).toHaveBeenCalledWith(
      expect.objectContaining({ expiresAt: REGISTRATION_CLOSES_AT }),
    );
  });

  it('should default expiresAt to now + 30 days when neither registrationClosesAt nor startsAt are set', async () => {
    mockTournamentRepository.findByIdSV.mockResolvedValue({
      ...BASE_TOURNAMENT,
      registrationClosesAt: null,
      startsAt: null,
    });

    const BEFORE = Date.now();
    await useCase.executeSV({ tournamentId: 'tournament-1', actorUserId: 'organizer-1' });
    const AFTER = Date.now();

    const CALL_ARG = mockInviteLinkRepository.createSV.mock.calls[0]?.[0] as { expiresAt: Date };
    const THIRTY_DAYS_MS = 30 * 24 * 60 * 60 * 1000;
    expect(CALL_ARG.expiresAt.getTime()).toBeGreaterThanOrEqual(BEFORE + THIRTY_DAYS_MS);
    expect(CALL_ARG.expiresAt.getTime()).toBeLessThanOrEqual(AFTER + THIRTY_DAYS_MS);
  });

  it('should throw 422 when an explicit expiresAt override is outside [now+1h, now+180d]', async () => {
    const TOO_SOON = new Date(Date.now() + 10 * 60 * 1000);

    await expect(
      useCase.executeSV({
        tournamentId: 'tournament-1',
        actorUserId: 'organizer-1',
        expiresAt: TOO_SOON,
      }),
    ).rejects.toMatchObject({ statusCode: 422 });

    const TOO_FAR = new Date(Date.now() + 200 * 24 * 60 * 60 * 1000);
    await expect(
      useCase.executeSV({
        tournamentId: 'tournament-1',
        actorUserId: 'organizer-1',
        expiresAt: TOO_FAR,
      }),
    ).rejects.toMatchObject({ statusCode: 422 });

    expect(mockInviteLinkRepository.createSV).not.toHaveBeenCalled();
  });

  it.each([0, -1])('should throw 422 when maxUses is %i (must be null or >= 1)', async (_maxUses) => {
    await expect(
      useCase.executeSV({ tournamentId: 'tournament-1', actorUserId: 'organizer-1', maxUses: _maxUses }),
    ).rejects.toMatchObject({ statusCode: 422 });

    expect(mockInviteLinkRepository.createSV).not.toHaveBeenCalled();
  });
});
