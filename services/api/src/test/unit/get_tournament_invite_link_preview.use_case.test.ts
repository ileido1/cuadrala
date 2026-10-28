import { beforeEach, describe, expect, it, vi } from 'vitest';

import { GetTournamentInviteLinkPreviewUseCase } from '../../application/use_cases/get_tournament_invite_link_preview.use_case.js';

const mockInviteLinkRepository = {
  findByTokenHashSV: vi.fn(),
};

const mockTournamentRepository = {
  findByIdSV: vi.fn(),
};

const mockSportRepository = {
  findByIdSV: vi.fn(),
};

const mockCategoryRepository = {
  findByIdSV: vi.fn(),
};

const mockVenueRepository = {
  findByIdSV: vi.fn(),
};

const useCase = new GetTournamentInviteLinkPreviewUseCase(
  mockInviteLinkRepository as never,
  mockTournamentRepository as never,
  mockSportRepository as never,
  mockCategoryRepository as never,
  mockVenueRepository as never,
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
  venueId: 'venue-1',
  status: 'OPEN',
  startsAt: new Date('2099-01-01T00:00:00.000Z'),
  organizerUserId: 'organizer-1',
};

beforeEach(() => {
  vi.clearAllMocks();
  mockInviteLinkRepository.findByTokenHashSV.mockResolvedValue(VALID_LINK);
  mockTournamentRepository.findByIdSV.mockResolvedValue(BASE_TOURNAMENT);
  mockSportRepository.findByIdSV.mockResolvedValue({ id: 'sport-1', code: 'PADEL', name: 'Pádel' });
  mockCategoryRepository.findByIdSV.mockResolvedValue({
    id: 'category-1',
    sportId: 'sport-1',
    name: '4ta',
    slug: '4ta',
    scheme: 'RACKET_ORDINAL',
    skillBand: null,
    sortOrder: 4,
  });
  mockVenueRepository.findByIdSV.mockResolvedValue({ id: 'venue-1', name: 'Club Demo' });
});

describe('GetTournamentInviteLinkPreviewUseCase', () => {
  it('should return the preview shape with acceptsRegistration reflecting isTournamentRosterOpenSV', async () => {
    const RESULT = await useCase.executeSV('raw-token-abc');

    expect(RESULT).toEqual({
      tournamentId: 'tournament-1',
      tournamentName: 'Torneo Demo',
      sportName: 'Pádel',
      categoryName: '4ta',
      venueName: 'Club Demo',
      startsAt: BASE_TOURNAMENT.startsAt,
      status: 'OPEN',
      acceptsRegistration: true,
    });
  });

  it('should reflect acceptsRegistration = false without throwing when the roster window is closed', async () => {
    mockTournamentRepository.findByIdSV.mockResolvedValue({ ...BASE_TOURNAMENT, status: 'IN_PROGRESS' });

    const RESULT = await useCase.executeSV('raw-token-abc');

    expect(RESULT.status).toBe('IN_PROGRESS');
    expect(RESULT.acceptsRegistration).toBe(false);
  });

  it('should throw 410 ENLACE_INVALIDO when the link is expired (via assertTournamentInviteLinkUsableSV)', async () => {
    mockInviteLinkRepository.findByTokenHashSV.mockResolvedValue({
      ...VALID_LINK,
      expiresAt: new Date(Date.now() - 1000),
    });

    await expect(useCase.executeSV('raw-token-abc')).rejects.toMatchObject({
      code: 'ENLACE_INVALIDO',
      statusCode: 410,
    });
  });

  it('should throw 409 ENLACE_REVOCADO when the link was revoked (via assertTournamentInviteLinkUsableSV)', async () => {
    mockInviteLinkRepository.findByTokenHashSV.mockResolvedValue({
      ...VALID_LINK,
      revokedAt: new Date(),
    });

    await expect(useCase.executeSV('raw-token-abc')).rejects.toMatchObject({
      code: 'ENLACE_REVOCADO',
      statusCode: 409,
    });
  });

  it('should throw 409 ENLACE_AGOTADO when the link exhausted its uses (via assertTournamentInviteLinkUsableSV)', async () => {
    mockInviteLinkRepository.findByTokenHashSV.mockResolvedValue({
      ...VALID_LINK,
      maxUses: 5,
      usesCount: 5,
    });

    await expect(useCase.executeSV('raw-token-abc')).rejects.toMatchObject({
      code: 'ENLACE_AGOTADO',
      statusCode: 409,
    });
  });

  it('should throw 410 ENLACE_INVALIDO when no link matches the token hash (fail-closed, no existence leak)', async () => {
    mockInviteLinkRepository.findByTokenHashSV.mockResolvedValue(null);

    await expect(useCase.executeSV('raw-token-abc')).rejects.toMatchObject({
      code: 'ENLACE_INVALIDO',
      statusCode: 410,
    });
  });
});
