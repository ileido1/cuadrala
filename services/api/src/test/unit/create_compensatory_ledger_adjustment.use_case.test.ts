import { afterEach, describe, expect, it, vi } from 'vitest';

import { CreateCompensatoryLedgerAdjustmentUseCase } from '../../application/use_cases/create_compensatory_ledger_adjustment.use_case.js';
import type { PaymentReservationReadRepository } from '../../domain/ports/payment_reservation_read_repository.js';
import type { ReservationLedgerRepository } from '../../domain/ports/reservation_ledger_repository.js';

const PREV_LEDGER = process.env.RESERVATION_PAYMENT_LEDGER;

describe('CreateCompensatoryLedgerAdjustmentUseCase', () => {
  afterEach(() => {
    process.env.RESERVATION_PAYMENT_LEDGER = PREV_LEDGER;
  });

  it('should append ADJUSTMENT DEBIT and CREDIT pair when ledger enabled', async () => {
    process.env.RESERVATION_PAYMENT_LEDGER = 'true';
    const APPEND = vi
      .fn()
      .mockResolvedValueOnce({ id: 'debit-1' })
      .mockResolvedValueOnce({ id: 'credit-1' });
    const LEDGER: ReservationLedgerRepository = {
      appendEntrySV: APPEND,
      sumAmountBsMinorByReservationSV: vi.fn(),
      listBsDiscrepanciesSV: vi.fn(),
    };
    const RESERVATION_READ: PaymentReservationReadRepository = {
      findByIdSV: vi.fn().mockResolvedValue({
        id: 'res-1',
        venueId: 'venue-1',
        durationMinutes: 60,
        totalAmountCents: null,
        pricingCurrency: 'USD',
        totalAmountMinor: 10000n,
        paidAmountMinor: 0n,
        court: null,
      }),
      updateTotalAmountCentsSV: vi.fn(),
    };

    const UC = new CreateCompensatoryLedgerAdjustmentUseCase(LEDGER, RESERVATION_READ);
    const RESULT = await UC.executeSV({
      venueId: 'venue-1',
      reservationId: 'res-1',
      amountMinor: 100n,
      currencyCode: 'USD',
      amountBsMinor: 5000n,
      actorUserId: 'staff-1',
      reason: 'Corrección conciliación',
    });

    expect(RESULT).toEqual({ debitEntryId: 'debit-1', creditEntryId: 'credit-1' });
    expect(APPEND).toHaveBeenCalledTimes(2);
    expect(APPEND.mock.calls[0]?.[0]).toMatchObject({
      entryType: 'ADJUSTMENT',
      direction: 'DEBIT',
    });
    expect(APPEND.mock.calls[1]?.[0]).toMatchObject({
      entryType: 'ADJUSTMENT',
      direction: 'CREDIT',
    });
  });

  it('should reject when reservation venue does not match', async () => {
    process.env.RESERVATION_PAYMENT_LEDGER = 'true';
    const LEDGER: ReservationLedgerRepository = {
      appendEntrySV: vi.fn(),
      sumAmountBsMinorByReservationSV: vi.fn(),
      listBsDiscrepanciesSV: vi.fn(),
    };
    const RESERVATION_READ: PaymentReservationReadRepository = {
      findByIdSV: vi.fn().mockResolvedValue({
        id: 'res-1',
        venueId: 'other-venue',
        durationMinutes: null,
        totalAmountCents: null,
        pricingCurrency: 'USD',
        totalAmountMinor: null,
        paidAmountMinor: 0n,
        court: null,
      }),
      updateTotalAmountCentsSV: vi.fn(),
    };

    const UC = new CreateCompensatoryLedgerAdjustmentUseCase(LEDGER, RESERVATION_READ);
    await expect(
      UC.executeSV({
        venueId: 'venue-1',
        reservationId: 'res-1',
        amountMinor: 100n,
        currencyCode: 'USD',
        amountBsMinor: 5000n,
        actorUserId: 'staff-1',
        reason: 'test',
      }),
    ).rejects.toMatchObject({ code: 'RESERVA_NO_PERTENECE_SEDE', statusCode: 404 });
  });
});
