import { Prisma } from '../../generated/prisma/client.js';
import { describe, expect, it } from 'vitest';

import {
  mapPrismaTransactionToPaymentRowSV,
  mapPrismaTransactionToPendingStaffRowSV,
} from '../../infrastructure/adapters/prisma_payment_transaction_mapper.js';

function sampleTransaction() {
  const CREATED_AT = new Date('2026-05-15T10:00:00.000Z');
  return {
    id: 'tx-1',
    matchId: 'match-1',
    reservationId: null,
    userId: 'user-1',
    amountBase: new Prisma.Decimal('8.00'),
    feeAmount: new Prisma.Decimal('0.50'),
    amountTotal: new Prisma.Decimal('8.50'),
    status: 'PENDING',
    paymentMethod: 'MANUAL',
    confirmedAt: null,
    createdAt: CREATED_AT,
    updatedAt: CREATED_AT,
    venuePaymentMethodId: null,
    referenceNumber: null,
    paymentData: null,
    confirmedBy: null,
    obligationCurrency: null,
    obligationAmountMinor: null,
    feeAmountMinor: null,
    obligationTotalMinor: null,
    pricingCurrency: null,
    settlementCurrency: null,
    settlementAmountMinor: null,
    appliedToObligationMinor: null,
    amountBsMinor: null,
  };
}

describe('prisma_payment_transaction_mapper', () => {
  it('mapPrismaTransactionToPaymentRowSV maps core payment fields', () => {
    const ROW = mapPrismaTransactionToPaymentRowSV(sampleTransaction());

    expect(ROW.id).toBe('tx-1');
    expect(ROW.matchId).toBe('match-1');
    expect(ROW.status).toBe('PENDING');
    expect(ROW.amountTotal.toString()).toBe('8.5');
  });

  it('mapPrismaTransactionToPendingStaffRowSV maps pending staff list fields', () => {
    const ROW = mapPrismaTransactionToPendingStaffRowSV(sampleTransaction());

    expect(ROW.id).toBe('tx-1');
    expect(ROW.userId).toBe('user-1');
    expect(ROW.amountTotal.toString()).toBe('8.5');
    expect(ROW.createdAt).toEqual(sampleTransaction().createdAt);
  });
});
