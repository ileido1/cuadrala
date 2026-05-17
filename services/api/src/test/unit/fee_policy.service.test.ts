import { describe, expect, it } from 'vitest';
import {
  computeFeeAmountSV,
  computeFeeMinorSV,
  computeObligationFeeSV,
} from '../../domain/services/payments/fee_policy.service.js';

describe('computeFeeAmountSV', () => {
  it('should return 0 when rule is null', () => {
    expect(computeFeeAmountSV(100, null)).toBe(0);
  });

  it('should apply fixed fee', () => {
    expect(computeFeeAmountSV(100, { type: 'FIXED', value: 50 })).toBe(50);
  });

  it('should apply percentage fee rounded', () => {
    expect(computeFeeAmountSV(100, { type: 'PERCENTAGE', value: 10 })).toBe(10);
  });
});

describe('computeFeeMinorSV', () => {
  it('should apply venue percentage on minor base', () => {
    const FEE = computeFeeMinorSV(10000n, {
      type: 'PERCENTAGE',
      value: 10,
      source: 'VENUE',
    });
    expect(FEE).toBe(1000n);
  });

  it('should apply venue fixed fee in minor units', () => {
    const FEE = computeFeeMinorSV(10000n, {
      type: 'FIXED',
      value: 500,
      source: 'VENUE',
    });
    expect(FEE).toBe(500n);
  });
});

describe('computeObligationFeeSV', () => {
  it('should prefer venue rule over global semantics', () => {
    const FEE = computeObligationFeeSV(50, {
      type: 'PERCENTAGE',
      value: 10,
      source: 'VENUE',
    });
    expect(FEE).toBe(5);
  });
});
