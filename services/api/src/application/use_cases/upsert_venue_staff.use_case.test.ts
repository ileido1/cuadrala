/**
 * Unit tests para UpsertVenueStaffUseCase — issue #67.
 *
 * Test pattern: TDD Red-Green-Refactor con Vitest.
 * Usa mock de VenueStaffRepository para aislar el use case.
 */

import { describe, expect, it, vi, beforeEach } from 'vitest';

import { AppError } from '../../domain/errors/app_error.js';
import { UpsertVenueStaffUseCase } from './upsert_venue_staff.use_case.js';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Mock factory para VenueStaffRepository. Por defecto el actor SI es staff. */
function createMockVenueStaffRepository(_isStaff = true) {
  return {
    isUserStaffOfVenueSV: vi.fn().mockResolvedValue(_isStaff),
    upsertSV: vi.fn().mockResolvedValue({
      created: true,
      staff: { id: 'staff-2', venueId: 'venue-1', userId: 'user-2', role: 'STAFF' },
    }),
    findByVenueAndUserSV: vi.fn(),
    listByUserIdSV: vi.fn(),
    removeByVenueAndUserSV: vi.fn(),
  };
}

describe('UpsertVenueStaffUseCase', () => {
  let staffRepo: ReturnType<typeof createMockVenueStaffRepository>;

  beforeEach(() => {
    staffRepo = createMockVenueStaffRepository();
  });

  it('should throw 403 when the actor is not staff of the venue', async () => {
    staffRepo = createMockVenueStaffRepository(false);
    const useCase = new UpsertVenueStaffUseCase(staffRepo);

    await expect(
      useCase.executeSV({
        actorUserId: 'intruder-1',
        venueId: 'venue-1',
        userId: 'user-2',
      }),
    ).rejects.toMatchObject({ statusCode: 403, code: 'NO_AUTORIZADO' } satisfies Partial<AppError>);

    expect(staffRepo.upsertSV).not.toHaveBeenCalled();
  });

  it('should let an existing staff member add another staff member', async () => {
    const useCase = new UpsertVenueStaffUseCase(staffRepo);

    const RESULT = await useCase.executeSV({
      actorUserId: 'staff-1',
      venueId: 'venue-1',
      userId: 'user-2',
      role: 'STAFF',
    });

    expect(staffRepo.isUserStaffOfVenueSV).toHaveBeenCalledWith('staff-1', 'venue-1');
    expect(staffRepo.upsertSV).toHaveBeenCalledWith({
      venueId: 'venue-1',
      userId: 'user-2',
      role: 'STAFF',
    });
    expect(RESULT.created).toBe(true);
    expect(RESULT.staff.userId).toBe('user-2');
  });

  it('should let the venue owner (already staff via auto-creation) add another staff member', async () => {
    // El owner ya quedó como VenueStaff role OWNER al crearse la sede
    // (ver createVenueSV), asi que isUserStaffOfVenueSV ya lo cubre sin
    // necesitar una excepcion de bootstrap aparte.
    const useCase = new UpsertVenueStaffUseCase(staffRepo);

    const RESULT = await useCase.executeSV({
      actorUserId: 'owner-1',
      venueId: 'venue-1',
      userId: 'user-3',
      role: 'STAFF',
    });

    expect(staffRepo.isUserStaffOfVenueSV).toHaveBeenCalledWith('owner-1', 'venue-1');
    expect(RESULT.created).toBe(true);
  });
});
