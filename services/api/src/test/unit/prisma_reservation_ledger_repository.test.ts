import { describe, expect, it, vi } from 'vitest';

import { PrismaReservationLedgerRepository } from '../../infrastructure/adapters/prisma_reservation_ledger_repository.js';

describe('PrismaReservationLedgerRepository', () => {
  it('should use injected prisma client for appendEntrySV', async () => {
    const CREATE = vi.fn().mockResolvedValue({ id: 'ledger-1' });
    const PRISMA = {
      reservationPaymentLedger: { create: CREATE },
    };

    const REPO = new PrismaReservationLedgerRepository(
      PRISMA as never,
    );

    const RESULT = await REPO.appendEntrySV({
      reservationId: 'res-1',
      transactionId: 'tx-1',
      entryType: 'PAYMENT',
      direction: 'CREDIT',
      amountMinor: 100n,
      currencyCode: 'USD',
      amountBsMinor: 5000n,
      actorUserId: 'staff-1',
    });

    expect(RESULT.id).toBe('ledger-1');
    expect(CREATE).toHaveBeenCalledOnce();
  });
});
