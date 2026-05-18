import { describe, expect, it, vi } from 'vitest';

import { ReconcileReservationLedgerUseCase } from '../../application/use_cases/reconcile_reservation_ledger.use_case.js';
import type { ReservationLedgerRepository } from '../../domain/ports/reservation_ledger_repository.js';

describe('ReconcileReservationLedgerUseCase', () => {
  it('should return discrepancies as string amounts', async () => {
    const REPO: ReservationLedgerRepository = {
      appendEntrySV: vi.fn(),
      sumAmountBsMinorByReservationSV: vi.fn(),
      listBsDiscrepanciesSV: vi.fn().mockResolvedValue([
        {
          reservationId: 'res-1',
          ledgerSumBsMinor: 10000n,
          paidAmountBsMinor: 9500n,
          deltaBsMinor: 500n,
        },
      ]),
    };

    const UC = new ReconcileReservationLedgerUseCase(REPO);
    const RESULT = await UC.executeSV(1n);

    expect(RESULT.discrepancyCount).toBe(1);
    expect(RESULT.discrepancies[0]).toEqual({
      reservationId: 'res-1',
      ledgerSumBsMinor: '10000',
      paidAmountBsMinor: '9500',
      deltaBsMinor: '500',
    });
    expect(RESULT.toleranceBsMinor).toBe('1');
  });
});
