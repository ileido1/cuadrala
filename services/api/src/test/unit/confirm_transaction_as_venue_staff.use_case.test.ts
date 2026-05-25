import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { AppError } from '../../domain/errors/app_error.js';
import { ConfirmTransactionAsVenueStaffUseCase } from '../../application/use_cases/confirm_transaction_as_venue_staff.use_case.js';
import type { StaffTransactionRow } from '../../domain/ports/venue_staff_transaction_repository.js';

const MATCH_TX: StaffTransactionRow = {
  id: 'tx-match-1',
  status: 'PENDING',
  matchId: 'match-1',
  reservationId: null,
  confirmedAt: null,
  amountBase: { toString: () => '10' } as never,
  feeAmount: { toString: () => '0' } as never,
  amountTotal: { toString: () => '25' } as never,
  match: {
    scheduledAt: new Date('2026-05-20T18:00:00.000Z'),
    court: {
      venueId: 'venue-1',
      venue: {
        countryCode: 'VE',
        pricingCurrency: 'USD',
        monetizationSettings: { timezone: 'America/Caracas' },
      },
    },
  },
  reservation: undefined,
};

describe('ConfirmTransactionAsVenueStaffUseCase', () => {
  const PREV_MCP = process.env.MULTI_CURRENCY_PAYMENTS;

  beforeEach(() => {
    process.env.MULTI_CURRENCY_PAYMENTS = 'true';
  });

  afterEach(() => {
    process.env.MULTI_CURRENCY_PAYMENTS = PREV_MCP;
  });

  it('should require settlementAmount when confirming match payment with MCP context', async () => {
    const TX_REPO = {
      findForStaffConfirmSV: vi.fn().mockResolvedValue(MATCH_TX),
      confirmManualSV: vi.fn(),
      syncReservationPaymentSV: vi.fn(),
    };
    const STAFF = {
      isUserStaffOfVenueSV: vi.fn().mockResolvedValue(true),
    };
    const UC = new ConfirmTransactionAsVenueStaffUseCase(
      STAFF as never,
      TX_REPO as never,
      { findByIdSV: vi.fn() } as never,
      { convertMinorBetweenCurrenciesSV: vi.fn() } as never,
      { executeSV: vi.fn() } as never,
    );

    await expect(
      UC.executeSV({
        transactionId: 'tx-match-1',
        userId: 'staff-1',
      }),
    ).rejects.toMatchObject({
      code: 'SETTLEMENT_AMOUNT_REQUERIDO',
    } satisfies Partial<AppError>);

    expect(TX_REPO.confirmManualSV).not.toHaveBeenCalled();
  });
});
