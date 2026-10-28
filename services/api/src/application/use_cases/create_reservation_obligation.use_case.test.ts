/**
 * Unit tests para CreateReservationObligationUseCase — issue #49 (lado reserva).
 *
 * Test pattern: TDD Red-Green-Refactor con Vitest.
 * Mockea los puertos para aislar el use case.
 */

import { describe, expect, it, vi, beforeEach } from 'vitest';

import { AppError } from '../../domain/errors/app_error.js';
import { CreateReservationObligationUseCase } from './create_reservation_obligation.use_case.js';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function createMockReservationReadRepository() {
  return {
    findByIdSV: vi.fn().mockResolvedValue({
      id: 'res-1',
      venueId: 'venue-1',
      durationMinutes: 60,
      totalAmountCents: 5000,
      pricingCurrency: 'USD',
      totalAmountMinor: 5000n,
      paidAmountMinor: 0n,
      scheduledAt: new Date('2026-01-01T10:00:00Z'),
      court: null,
    }),
    updateTotalAmountCentsSV: vi.fn(),
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

function createMockVenueStaffRepository(_isStaff = true) {
  return {
    isUserStaffOfVenueSV: vi.fn().mockResolvedValue(_isStaff),
    upsertSV: vi.fn(),
    findByVenueAndUserSV: vi.fn(),
    listByUserIdSV: vi.fn(),
    removeByVenueAndUserSV: vi.fn(),
  };
}

describe('CreateReservationObligationUseCase', () => {
  let reservationRepo: ReturnType<typeof createMockReservationReadRepository>;
  let txRepo: ReturnType<typeof createMockTransactionRepository>;
  let feeRepo: ReturnType<typeof createMockFeeRuleRepository>;
  let staffRepo: ReturnType<typeof createMockVenueStaffRepository>;

  beforeEach(() => {
    reservationRepo = createMockReservationReadRepository();
    txRepo = createMockTransactionRepository();
    feeRepo = createMockFeeRuleRepository();
    staffRepo = createMockVenueStaffRepository();
  });

  it('should throw 403 when the actor is not venue staff of the reservation venue', async () => {
    staffRepo = createMockVenueStaffRepository(false);
    const useCase = new CreateReservationObligationUseCase(reservationRepo, txRepo, feeRepo, staffRepo);

    await expect(
      useCase.executeSV({
        reservationId: 'res-1',
        actorUserId: 'intruder-9',
        amountBasePerPerson: 10,
        participantUserIds: ['organizer-1'],
      }),
    ).rejects.toMatchObject({ statusCode: 403, code: 'NO_AUTORIZADO' } satisfies Partial<AppError>);

    expect(txRepo.createSV).not.toHaveBeenCalled();
  });

  it('should let venue staff generate the obligation for the reservation organizer', async () => {
    const useCase = new CreateReservationObligationUseCase(reservationRepo, txRepo, feeRepo, staffRepo);

    const RESULT = await useCase.executeSV({
      reservationId: 'res-1',
      actorUserId: 'staff-1',
      amountBasePerPerson: 10,
      participantUserIds: ['organizer-1'],
    });

    expect(staffRepo.isUserStaffOfVenueSV).toHaveBeenCalledWith('staff-1', 'venue-1');
    expect(txRepo.createSV).toHaveBeenCalledWith(
      expect.objectContaining({ reservationId: 'res-1', userId: 'organizer-1' }),
    );
    expect(RESULT.created).toHaveLength(1);
    expect(RESULT.created[0]?.userId).toBe('organizer-1');
  });

  it('should reject the organizer themselves generating it when they are not venue staff', async () => {
    staffRepo = createMockVenueStaffRepository(false);
    const useCase = new CreateReservationObligationUseCase(reservationRepo, txRepo, feeRepo, staffRepo);

    await expect(
      useCase.executeSV({
        reservationId: 'res-1',
        actorUserId: 'organizer-1',
        amountBasePerPerson: 10,
        participantUserIds: ['organizer-1'],
      }),
    ).rejects.toMatchObject({ statusCode: 403, code: 'NO_AUTORIZADO' } satisfies Partial<AppError>);
  });
});
