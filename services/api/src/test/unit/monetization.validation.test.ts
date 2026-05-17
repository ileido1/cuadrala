import { describe, expect, it } from 'vitest';

import { CONFIRM_TRANSACTION_BODY_SCHEMA } from '../../presentation/validation/monetization.validation.js';

describe('CONFIRM_TRANSACTION_BODY_SCHEMA', () => {
  it('should parse empty body when confirming manual payment', () => {
    const result = CONFIRM_TRANSACTION_BODY_SCHEMA.parse({});

    expect(result).toEqual({});
  });

  it('should treat empty venuePaymentMethodId as undefined', () => {
    const result = CONFIRM_TRANSACTION_BODY_SCHEMA.parse({
      venuePaymentMethodId: '',
    });

    expect(result.venuePaymentMethodId).toBeUndefined();
  });

  it('should accept legacy seed payment method ids', () => {
    const result = CONFIRM_TRANSACTION_BODY_SCHEMA.parse({
      venuePaymentMethodId: 'seed-payment-method-2',
    });

    expect(result.venuePaymentMethodId).toBe('seed-payment-method-2');
  });

  it('should parse body with paymentData record', () => {
    const result = CONFIRM_TRANSACTION_BODY_SCHEMA.parse({
      venuePaymentMethodId: '550e8400-e29b-41d4-a716-446655440000',
      referenceNumber: 'REF-123',
      paymentData: { bank: 'Mercantil', accountNumber: '123' },
    });

    expect(result.paymentData).toEqual({ bank: 'Mercantil', accountNumber: '123' });
  });
});
