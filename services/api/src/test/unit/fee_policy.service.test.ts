import { describe, expect, it } from 'vitest';
import { computeFeeAmountSV } from '../../domain/services/payments/fee_policy.service.js';

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
