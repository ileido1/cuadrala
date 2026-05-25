import { describe, expect, it, vi } from 'vitest';

import { CreateMatchUseCase } from '../../application/use_cases/create_match.use_case.js';
import type { MatchCourtAvailabilityRepository } from '../../domain/ports/match_court_availability_repository.js';
import type { MatchCrudRepository } from '../../domain/ports/match_crud_repository.js';
import type { UserCategoryRepository } from '../../domain/ports/user_category_repository.js';

const VENUE_ID = '00000000-0000-4000-8000-000000000004';
const COURT_ID = '00000000-0000-4000-8000-000000000003';

function buildAvailabilityRepo(): MatchCourtAvailabilityRepository {
  return {
    listVenueCourtsSV: vi.fn(),
    getCourtVenueIdSV: vi.fn().mockResolvedValue(VENUE_ID),
    findPublishedVacantAtCourtScheduledAtSV: vi.fn().mockResolvedValue(null),
    findConflictingActiveMatchIdSV: vi.fn().mockResolvedValue(null),
    hasConfirmedReservationAtCourtScheduledAtSV: vi.fn().mockResolvedValue(false),
  };
}

function buildUserCategoryRepo(_hasCategory = true): UserCategoryRepository {
  return {
    userHasCategoryForSportSV: vi.fn().mockResolvedValue(_hasCategory),
    userHasCategorySV: vi.fn(),
    listByUserIdSV: vi.fn(),
    upsertForUserSportSV: vi.fn(),
    replaceForUserSV: vi.fn(),
  };
}

describe('CreateMatchUseCase', () => {
  it('should reject when creator category does not match sport profile', async () => {
    const availability = buildAvailabilityRepo();
    const crud: MatchCrudRepository = {
      createMatchSV: vi.fn(),
      updateMatchSV: vi.fn(),
      cancelMatchSV: vi.fn(),
    };
    const uc = new CreateMatchUseCase(
      crud,
      availability,
      buildUserCategoryRepo(false),
    );

    await expect(
      uc.executeSV({
        creatorUserId: 'user-1',
        sportId: '00000000-0000-4000-8000-000000000001',
        categoryId: '00000000-0000-4000-8000-000000000002',
      }),
    ).rejects.toMatchObject({
      code: 'CATEGORIA_NO_COMPATIBLE',
      statusCode: 403,
    });

    expect(crud.createMatchSV).not.toHaveBeenCalled();
  });

  it('should reject when confirmed reservation exists at court slot', async () => {
    const availability = buildAvailabilityRepo();
    vi.mocked(availability.hasConfirmedReservationAtCourtScheduledAtSV).mockResolvedValue(
      true,
    );

    const crud: MatchCrudRepository = {
      createMatchSV: vi.fn(),
      updateMatchSV: vi.fn(),
      cancelMatchSV: vi.fn(),
    };

    const uc = new CreateMatchUseCase(crud, availability, buildUserCategoryRepo());

    await expect(
      uc.executeSV({
        creatorUserId: 'user-1',
        sportId: '00000000-0000-4000-8000-000000000001',
        categoryId: '00000000-0000-4000-8000-000000000002',
        courtId: COURT_ID,
        venueId: VENUE_ID,
        scheduledAt: new Date('2026-06-01T15:00:00.000Z'),
        durationMinutes: 90,
      }),
    ).rejects.toMatchObject({
      code: 'CONFLICTO',
      statusCode: 409,
    });

    expect(crud.createMatchSV).not.toHaveBeenCalled();
  });

  it('should pass venueId and durationMinutes to repository when court scheduled', async () => {
    const availability = buildAvailabilityRepo();
    const crud: MatchCrudRepository = {
      createMatchSV: vi.fn().mockResolvedValue({
        id: 'match-1',
        sportId: 's',
        categoryId: 'c',
        type: 'REGULAR',
        status: 'SCHEDULED',
        scheduledAt: new Date(),
        courtId: 'court',
        tournamentId: null,
        pricePerPlayerCents: 0,
        maxParticipants: 4,
        participantCount: 1,
        createdAt: new Date(),
        updatedAt: new Date(),
      }),
      updateMatchSV: vi.fn(),
      cancelMatchSV: vi.fn(),
    };

    const uc = new CreateMatchUseCase(crud, availability, buildUserCategoryRepo());
    const scheduledAt = new Date('2026-06-01T15:00:00.000Z');

    await uc.executeSV({
      creatorUserId: 'user-1',
      sportId: '00000000-0000-4000-8000-000000000001',
      categoryId: '00000000-0000-4000-8000-000000000002',
      courtId: COURT_ID,
      venueId: VENUE_ID,
      scheduledAt,
      durationMinutes: 90,
    });

    expect(crud.createMatchSV).toHaveBeenCalledWith(
      expect.objectContaining({
        venueId: VENUE_ID,
        durationMinutes: 90,
        courtId: COURT_ID,
        scheduledAt,
      }),
      'user-1',
    );
  });
});
