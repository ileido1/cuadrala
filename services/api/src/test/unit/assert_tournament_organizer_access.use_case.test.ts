import { beforeEach, describe, expect, it } from 'vitest';

import { AssertTournamentOrganizerAccessUseCase } from '../../application/use_cases/assert_tournament_organizer_access.use_case.js';

const venueStaffRepo = { isUserStaffOfVenueSV: async (_userId: string, _venueId: string) => false };

let useCase: AssertTournamentOrganizerAccessUseCase;
let staffCalls: Array<{ userId: string; venueId: string }>;
let staffResult: boolean;

beforeEach(() => {
  staffCalls = [];
  staffResult = false;
  venueStaffRepo.isUserStaffOfVenueSV = async (_userId: string, _venueId: string) => {
    staffCalls.push({ userId: _userId, venueId: _venueId });
    return staffResult;
  };
  useCase = new AssertTournamentOrganizerAccessUseCase(venueStaffRepo as never);
});

describe('AssertTournamentOrganizerAccessUseCase.hasAccessSV', () => {
  //? El chequeo booleano es la misma regla que executeSV, pero sin lanzar: lo
  //? reutilizan casos de uso que redactan datos en vez de rechazar la request.
  it('should return true when the actor is the tournament organizer', async () => {
    const RESULT = await useCase.hasAccessSV({
      actorUserId: 'organizer-1',
      organizerUserId: 'organizer-1',
      venueId: null,
    });

    expect(RESULT).toBe(true);
    expect(staffCalls).toHaveLength(0);
  });

  it('should return true when the actor is staff of the tournament venue', async () => {
    staffResult = true;

    const RESULT = await useCase.hasAccessSV({
      actorUserId: 'staff-1',
      organizerUserId: 'organizer-1',
      venueId: 'venue-1',
    });

    expect(RESULT).toBe(true);
    expect(staffCalls).toEqual([{ userId: 'staff-1', venueId: 'venue-1' }]);
  });

  it('should return false when the actor is neither the organizer nor venue staff', async () => {
    const RESULT = await useCase.hasAccessSV({
      actorUserId: 'outsider-1',
      organizerUserId: 'organizer-1',
      venueId: 'venue-1',
    });

    expect(RESULT).toBe(false);
  });

  it('should return false without querying venue staff when there is no venue', async () => {
    const RESULT = await useCase.hasAccessSV({
      actorUserId: 'outsider-1',
      organizerUserId: 'organizer-1',
      venueId: null,
    });

    expect(RESULT).toBe(false);
    expect(staffCalls).toHaveLength(0);
  });
});

describe('AssertTournamentOrganizerAccessUseCase.executeSV', () => {
  it('should resolve when hasAccessSV would return true', async () => {
    await expect(
      useCase.executeSV({ actorUserId: 'organizer-1', organizerUserId: 'organizer-1', venueId: null }),
    ).resolves.toBeUndefined();
  });

  it('should reject with a 403 AppError when hasAccessSV would return false', async () => {
    await expect(
      useCase.executeSV({ actorUserId: 'outsider-1', organizerUserId: 'organizer-1', venueId: null }),
    ).rejects.toMatchObject({ statusCode: 403, code: 'NO_AUTORIZADO' });
  });
});
