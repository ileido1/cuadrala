import { describe, expect, it, vi } from 'vitest';

import { RecordReservationLedgerEntryUseCase } from '../../application/use_cases/record_reservation_ledger_entry.use_case.js';
import type { ReservationLedgerRepository } from '../../domain/ports/reservation_ledger_repository.js';

describe('RecordReservationLedgerEntryUseCase', () => {
  it('should append PAYMENT CREDIT entry on executeSV', async () => {
    const APPEND = vi.fn().mockResolvedValue({ id: 'ledger-1' });
    const REPO: ReservationLedgerRepository = {
      appendEntrySV: APPEND,
      sumAmountBsMinorByReservationSV: vi.fn(),
      listBsDiscrepanciesSV: vi.fn(),
    };
    const UC = new RecordReservationLedgerEntryUseCase(REPO);

    const RESULT = await UC.executeSV({
      reservationId: 'res-1',
      transactionId: 'tx-1',
      appliedToObligationMinor: 5500n,
      pricingCurrency: 'USD',
      amountBsMinor: 275000n,
      actorUserId: 'user-staff',
    });

    expect(RESULT.id).toBe('ledger-1');
    expect(APPEND).toHaveBeenCalledWith(
      expect.objectContaining({
        reservationId: 'res-1',
        transactionId: 'tx-1',
        entryType: 'PAYMENT',
        direction: 'CREDIT',
        amountMinor: 5500n,
        currencyCode: 'USD',
        amountBsMinor: 275000n,
        actorUserId: 'user-staff',
      }),
    );
  });
});
