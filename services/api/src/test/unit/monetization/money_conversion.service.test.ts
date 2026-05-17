import { describe, expect, it } from 'vitest';

import { DefaultMoneyConversionService } from '../../../domain/services/money/money_conversion.service.js';
import { MoneyAmount } from '../../../domain/money/money_amount.js';

const SERVICE = new DefaultMoneyConversionService();

const USD_RATE = {
  currencyCode: 'USD' as const,
  rateBsMinorPerMajorUnit: 5000n,
  effectiveAt: new Date('2026-05-15T00:00:00.000Z'),
};

describe('DefaultMoneyConversionService', () => {
  it('should return same minor when amount is already BS', () => {
    const AMOUNT = MoneyAmount.fromMinor('BS', 250000n);
    const BS_RATE = {
      currencyCode: 'BS' as const,
      rateBsMinorPerMajorUnit: 100n,
      effectiveAt: USD_RATE.effectiveAt,
    };
    expect(SERVICE.toBsMinorSV(AMOUNT, BS_RATE)).toBe(250000n);
  });

  it('should convert USD minor to BS minor using rate', () => {
    const AMOUNT = MoneyAmount.fromMinor('USD', 2500n);
    expect(SERVICE.toBsMinorSV(AMOUNT, USD_RATE)).toBe(125000n);
  });

  it('should convert settlement USD to obligation BS', () => {
    const SETTLEMENT = MoneyAmount.fromMinor('USD', 1000n);
    const APPLIED = SERVICE.convertSettlementToObligationSV(
      SETTLEMENT,
      'BS',
      USD_RATE,
    );
    expect(APPLIED.currencyCode).toBe('BS');
    expect(APPLIED.amountMinor).toBe(50000n);
  });

  it('should keep amount when settlement and obligation share currency', () => {
    const SETTLEMENT = MoneyAmount.fromMinor('USD', 9900n);
    const APPLIED = SERVICE.convertSettlementToObligationSV(
      SETTLEMENT,
      'USD',
      USD_RATE,
      USD_RATE,
    );
    expect(APPLIED.amountMinor).toBe(9900n);
  });
});
