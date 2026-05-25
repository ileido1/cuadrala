import { Prisma } from '../../generated/prisma/client.js';
import { describe, expect, it } from 'vitest';

import {
  mapPrismaTransactionToPaymentRowSV,
  mapPrismaTransactionToPendingStaffRowSV,
  type PendingTransactionPrismaRow,
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
    needsReview: false,
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
    const BASE = sampleTransaction();
    const PENDING_ROW = {
      ...BASE,
      user: { name: 'Ana Pérez', email: 'ana@test.com' },
      receipts: [{ id: 'rcpt-1', mimeType: 'image/jpeg' }],
      match: {
        scheduledAt: new Date('2026-05-15T14:00:00.000Z'),
        sportId: 'sport-1',
        categoryId: 'cat-1',
        court: { id: 'court-1', name: 'Cancha 1', venueId: 'venue-1' },
      },
      reservation: null,
      obligationAmountMinor: BigInt(850),
      obligationCurrency: 'USD',
      pricingCurrency: 'USD',
    } as PendingTransactionPrismaRow;

    const ROW = mapPrismaTransactionToPendingStaffRowSV({
      ...PENDING_ROW,
      venuePaymentMethodId: '550e8400-e29b-41d4-a716-446655440000',
      venuePaymentMethod: {
        type: 'PAGO_MOVIL',
        name: 'Pago móvil sede',
        config: { bank: 'Banesco', phoneNumber: '04141234567' },
      },
      paymentData: null,
    } as PendingTransactionPrismaRow);

    expect(ROW.id).toBe('tx-1');
    expect(ROW.payerName).toBe('Ana Pérez');
    expect(ROW.receiptId).toBe('rcpt-1');
    expect(ROW.courtName).toBe('Cancha 1');
    expect(ROW.obligationAmountMinor).toBe('850');
    expect(ROW.paymentMethodName).toBe('Pago móvil sede');
    expect(ROW.venuePaymentMethodId).toBe('550e8400-e29b-41d4-a716-446655440000');
  });
});
