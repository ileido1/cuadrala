/**
 * Unit tests para CreateMatchObligationUseCase — issue #49 (lado partido).
 *
 * Test pattern: TDD Red-Green-Refactor con Vitest.
 * Mockea los puertos para aislar el use case.
 */

import { describe, expect, it, vi, beforeEach } from 'vitest';

import { AppError } from '../../domain/errors/app_error.js';
import { AssertTournamentOrganizerAccessUseCase } from './assert_tournament_organizer_access.use_case.js';
import { CreateMatchObligationUseCase } from './create_match_obligation.use_case.js';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function createMockMatchReadRepository(
  _participantIds: string[] = ['actor-1', 'other-2'],
  _organizerUserId = 'organizer-1',
  _venueId: string | null = 'venue-1',
) {
  return {
    findByIdSV: vi.fn(),
    findWithParticipantsSV: vi.fn().mockResolvedValue({
      id: 'match-1',
      venueId: _venueId,
      organizerUserId: _organizerUserId,
      participants: _participantIds.map((_id) => ({ userId: _id })),
    }),
  };
}

function createMockTransactionRepository() {
  return {
    findPendingOrConfirmedForMatchUserSV: vi.fn().mockResolvedValue(null),
    findPendingForReservationUserSV: vi.fn().mockResolvedValue(null),
    createSV: vi.fn().mockImplementation((_input) =>
      Promise.resolve({
        id: `tx-${_input.userId}`,
        matchId: _input.matchId ?? null,
        reservationId: _input.reservationId ?? null,
        userId: _input.userId,
        amountBase: { toString: () => _input.amountBase },
        feeAmount: { toString: () => _input.feeAmount },
        amountTotal: { toString: () => _input.amountTotal },
        status: 'PENDING',
        paymentMethod: 'NONE',
        confirmedAt: null,
        createdAt: new Date(),
      }),
    ),
    findByIdSV: vi.fn(),
    listByMatchSV: vi.fn(),
    listByReservationSV: vi.fn(),
    listByUserSV: vi.fn(),
    confirmManualSV: vi.fn(),
    rejectManualSV: vi.fn(),
    syncReservationPaymentSV: vi.fn(),
    findForStaffConfirmSV: vi.fn(),
    listPendingByVenueSV: vi.fn(),
    recordPlayerPaymentSelectionSV: vi.fn(),
  };
}

function createMockFeeRuleRepository() {
  return {
    findActiveForScopeSV: vi.fn().mockResolvedValue(null),
    findActiveForVenueAndScopeSV: vi.fn().mockResolvedValue(null),
  };
}

/** Mock de VenueStaffRepository para alimentar el AssertTournamentOrganizerAccessUseCase real. */
function createMockVenueStaffRepository(_isStaff = false) {
  return {
    isUserStaffOfVenueSV: vi.fn().mockResolvedValue(_isStaff),
    upsertSV: vi.fn(),
    findByVenueAndUserSV: vi.fn(),
    listByUserIdSV: vi.fn(),
    removeByVenueAndUserSV: vi.fn(),
  };
}

describe('CreateMatchObligationUseCase', () => {
  let matchRepo: ReturnType<typeof createMockMatchReadRepository>;
  let txRepo: ReturnType<typeof createMockTransactionRepository>;
  let feeRepo: ReturnType<typeof createMockFeeRuleRepository>;
  let staffRepo: ReturnType<typeof createMockVenueStaffRepository>;
  let assertOrganizerAccess: AssertTournamentOrganizerAccessUseCase;

  beforeEach(() => {
    matchRepo = createMockMatchReadRepository();
    txRepo = createMockTransactionRepository();
    feeRepo = createMockFeeRuleRepository();
    staffRepo = createMockVenueStaffRepository(false);
    assertOrganizerAccess = new AssertTournamentOrganizerAccessUseCase(staffRepo);
  });

  function buildUseCase(): CreateMatchObligationUseCase {
    return new CreateMatchObligationUseCase(matchRepo, txRepo, feeRepo, assertOrganizerAccess);
  }

  it('should throw 403 when a non-participant tries self-service', async () => {
    const useCase = buildUseCase();

    await expect(
      useCase.executeSV({
        matchId: 'match-1',
        actorUserId: 'intruder-9',
        amountBasePerPerson: 10,
        participantUserIds: ['intruder-9'],
      }),
    ).rejects.toMatchObject({ statusCode: 403, code: 'NO_AUTORIZADO' } satisfies Partial<AppError>);

    expect(txRepo.createSV).not.toHaveBeenCalled();
  });

  it('should let a participant generate their own obligation without any extra check', async () => {
    const useCase = buildUseCase();

    const RESULT = await useCase.executeSV({
      matchId: 'match-1',
      actorUserId: 'actor-1',
      amountBasePerPerson: 10,
      participantUserIds: ['actor-1'],
    });

    expect(staffRepo.isUserStaffOfVenueSV).not.toHaveBeenCalled();
    expect(RESULT.created).toHaveLength(1);
    expect(RESULT.created[0]?.userId).toBe('actor-1');
  });

  it('should default to the actor only when participantUserIds is not provided and the actor is not organizer/staff', async () => {
    matchRepo = createMockMatchReadRepository(['actor-1'], 'organizer-1', 'venue-1');
    const useCase = new CreateMatchObligationUseCase(matchRepo, txRepo, feeRepo, assertOrganizerAccess);

    const RESULT = await useCase.executeSV({
      matchId: 'match-1',
      actorUserId: 'actor-1',
      amountBasePerPerson: 10,
    });

    expect(RESULT.created).toHaveLength(1);
    expect(RESULT.created[0]?.userId).toBe('actor-1');
  });

  it('should let the match organizer generate obligations for all participants', async () => {
    matchRepo = createMockMatchReadRepository(['player-1', 'player-2'], 'organizer-1', 'venue-1');
    const useCase = new CreateMatchObligationUseCase(matchRepo, txRepo, feeRepo, assertOrganizerAccess);

    const RESULT = await useCase.executeSV({
      matchId: 'match-1',
      actorUserId: 'organizer-1',
      amountBasePerPerson: 10,
    });

    expect(txRepo.createSV).toHaveBeenCalledTimes(2);
    expect(RESULT.created).toHaveLength(2);
    const IDS = RESULT.created.map((_c) => _c.userId);
    expect(IDS).toContain('player-1');
    expect(IDS).toContain('player-2');
  });

  it('should let venue staff of the match venue generate obligations for all participants', async () => {
    matchRepo = createMockMatchReadRepository(['player-1', 'player-2'], 'organizer-1', 'venue-1');
    staffRepo = createMockVenueStaffRepository(true);
    assertOrganizerAccess = new AssertTournamentOrganizerAccessUseCase(staffRepo);
    const useCase = new CreateMatchObligationUseCase(matchRepo, txRepo, feeRepo, assertOrganizerAccess);

    const RESULT = await useCase.executeSV({
      matchId: 'match-1',
      actorUserId: 'staff-9',
      amountBasePerPerson: 10,
    });

    expect(staffRepo.isUserStaffOfVenueSV).toHaveBeenCalledWith('staff-9', 'venue-1');
    expect(RESULT.created).toHaveLength(2);
  });

  it('should throw 403 when a participant who is neither organizer nor staff tries to generate for another participant', async () => {
    matchRepo = createMockMatchReadRepository(['actor-1', 'other-2'], 'organizer-1', 'venue-1');
    const useCase = new CreateMatchObligationUseCase(matchRepo, txRepo, feeRepo, assertOrganizerAccess);

    await expect(
      useCase.executeSV({
        matchId: 'match-1',
        actorUserId: 'actor-1',
        amountBasePerPerson: 10,
        participantUserIds: ['other-2'],
      }),
    ).rejects.toMatchObject({ statusCode: 403, code: 'NO_AUTORIZADO' } satisfies Partial<AppError>);

    expect(txRepo.createSV).not.toHaveBeenCalled();
  });
});
