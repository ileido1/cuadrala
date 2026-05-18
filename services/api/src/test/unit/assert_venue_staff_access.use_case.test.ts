import { describe, expect, it, vi } from 'vitest';

import { AssertVenueStaffAccessUseCase } from '../../application/use_cases/assert_venue_staff_access.use_case.js';
import { AppError } from '../../domain/errors/app_error.js';

describe('AssertVenueStaffAccessUseCase', () => {
  const ACTOR_USER_ID = 'user-1';
  const VENUE_ID = 'venue-1';

  it('should resolve when user is staff of venue', async () => {
    const VENUE_STAFF_REPO = {
      isUserStaffOfVenueSV: vi.fn().mockResolvedValue(true),
    };
    const UC = new AssertVenueStaffAccessUseCase(VENUE_STAFF_REPO);

    await expect(
      UC.executeSV({ actorUserId: ACTOR_USER_ID, venueId: VENUE_ID }),
    ).resolves.toBeUndefined();

    expect(VENUE_STAFF_REPO.isUserStaffOfVenueSV).toHaveBeenCalledOnce();
    expect(VENUE_STAFF_REPO.isUserStaffOfVenueSV).toHaveBeenCalledWith(
      ACTOR_USER_ID,
      VENUE_ID,
    );
  });

  it('should throw 403 NO_AUTORIZADO when user is not staff', async () => {
    const VENUE_STAFF_REPO = {
      isUserStaffOfVenueSV: vi.fn().mockResolvedValue(false),
    };
    const UC = new AssertVenueStaffAccessUseCase(VENUE_STAFF_REPO);

    await expect(
      UC.executeSV({ actorUserId: ACTOR_USER_ID, venueId: VENUE_ID }),
    ).rejects.toMatchObject({
      code: 'NO_AUTORIZADO',
      statusCode: 403,
    } satisfies Partial<AppError>);

    expect(VENUE_STAFF_REPO.isUserStaffOfVenueSV).toHaveBeenCalledOnce();
  });

  it('should use custom forbiddenMessage when provided', async () => {
    const VENUE_STAFF_REPO = {
      isUserStaffOfVenueSV: vi.fn().mockResolvedValue(false),
    };
    const UC = new AssertVenueStaffAccessUseCase(VENUE_STAFF_REPO);
    const CUSTOM_MESSAGE = 'No tienes permisos para ver stats de esta sede.';

    await expect(
      UC.executeSV({
        actorUserId: ACTOR_USER_ID,
        venueId: VENUE_ID,
        forbiddenMessage: CUSTOM_MESSAGE,
      }),
    ).rejects.toMatchObject({
      message: CUSTOM_MESSAGE,
    });
  });
});
