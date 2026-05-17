import { describe, expect, it } from 'vitest';

import {
  LIST_VENUE_TRANSACTIONS_PARAMS_SCHEMA,
  VENUE_ID_PARAMS_SCHEMA,
} from './venue_staff.validation.js';
import { TRANSACTION_ID_PARAM_SCHEMA } from './monetization.validation.js';

const SAMPLE_UUID = '550e8400-e29b-41d4-a716-446655440000';

describe('VENUE_ID_PARAMS_SCHEMA', () => {
  it('rechaza venueId invalido', () => {
    const RESULT = VENUE_ID_PARAMS_SCHEMA.safeParse({ venueId: 'x' });
    expect(RESULT.success).toBe(false);
  });

  it('acepta venueId UUID valido', () => {
    const RESULT = VENUE_ID_PARAMS_SCHEMA.safeParse({ venueId: SAMPLE_UUID });
    expect(RESULT.success).toBe(true);
  });
});

describe('LIST_VENUE_TRANSACTIONS_PARAMS_SCHEMA', () => {
  it('rechaza venueId invalido', () => {
    const RESULT = LIST_VENUE_TRANSACTIONS_PARAMS_SCHEMA.safeParse({ venueId: 'bad' });
    expect(RESULT.success).toBe(false);
  });

  it('acepta venueId UUID valido', () => {
    const RESULT = LIST_VENUE_TRANSACTIONS_PARAMS_SCHEMA.safeParse({ venueId: SAMPLE_UUID });
    expect(RESULT.success).toBe(true);
  });
});

describe('TRANSACTION_ID_PARAM_SCHEMA', () => {
  it('rechaza transactionId invalido', () => {
    const RESULT = TRANSACTION_ID_PARAM_SCHEMA.safeParse({ transactionId: 'x' });
    expect(RESULT.success).toBe(false);
  });

  it('acepta transactionId UUID valido', () => {
    const RESULT = TRANSACTION_ID_PARAM_SCHEMA.safeParse({ transactionId: SAMPLE_UUID });
    expect(RESULT.success).toBe(true);
  });
});
