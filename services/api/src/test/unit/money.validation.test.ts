import { describe, expect, it } from 'vitest';

import {
  CURRENCY_CODE_SCHEMA,
  MONEY_AMOUNT_SCHEMA,
} from '../../presentation/validation/money.validation.js';
import { CONFIRM_TRANSACTION_BODY_SCHEMA } from '../../presentation/validation/monetization.validation.js';

describe('MONEY_AMOUNT_SCHEMA', () => {
  it('should parse amountMinor as string', () => {
    const RESULT = MONEY_AMOUNT_SCHEMA.parse({
      amountMinor: '9900',
      currencyCode: 'USD',
    });
    expect(RESULT).toEqual({ amountMinor: '9900', currencyCode: 'USD' });
  });

  it('should coerce numeric amountMinor to string', () => {
    const RESULT = MONEY_AMOUNT_SCHEMA.parse({
      amountMinor: 5000,
      currencyCode: 'BS',
    });
    expect(RESULT.amountMinor).toBe('5000');
  });

  it('should reject invalid currencyCode', () => {
    const RESULT = MONEY_AMOUNT_SCHEMA.safeParse({
      amountMinor: '100',
      currencyCode: 'MXN',
    });
    expect(RESULT.success).toBe(false);
  });
});

describe('CONFIRM_TRANSACTION_BODY_SCHEMA', () => {
  it('should allow empty body regardless of MULTI_CURRENCY_PAYMENTS', () => {
    const RESULT = CONFIRM_TRANSACTION_BODY_SCHEMA.safeParse({});
    expect(RESULT.success).toBe(true);
  });

  it('should accept settlementAmount when provided', () => {
    const RESULT = CONFIRM_TRANSACTION_BODY_SCHEMA.safeParse({
      settlementAmount: { amountMinor: '1100', currencyCode: 'USD' },
      venuePaymentMethodId: '550e8400-e29b-41d4-a716-446655440000',
    });
    expect(RESULT.success).toBe(true);
  });
});

describe('CURRENCY_CODE_SCHEMA', () => {
  it('should accept BS USD EUR', () => {
    expect(CURRENCY_CODE_SCHEMA.safeParse('EUR').success).toBe(true);
  });
});
