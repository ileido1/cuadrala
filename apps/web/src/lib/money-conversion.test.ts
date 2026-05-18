import { describe, expect, it } from 'vitest';

import {
  convertMinorBetweenCurrenciesSV,
  fromBsMinorSV,
  pickExchangeRateForDateSV,
  toBsMinorSV,
} from './money-conversion';

describe('money-conversion', () => {
  it('should convert USD minor to BS minor using rate 50 Bs/USD', () => {
    expect(toBsMinorSV(3000, 'USD', 50)).toBe(150_000);
  });

  it('should convert BS minor to USD minor using rate 50 Bs/USD', () => {
    expect(fromBsMinorSV(150_000, 'USD', 50)).toBe(3000);
  });

  it('should convert USD obligation to BS settlement', () => {
    expect(
      convertMinorBetweenCurrenciesSV(3000, 'USD', 'BS', 50, 1),
    ).toBe(150_000);
  });

  it('should pick rate for reservation calendar date', () => {
    const RATES = [
      {
        currency: 'USD',
        rateToBs: 48,
        effectiveDate: '2026-05-16T00:00:00.000Z',
      },
      {
        currency: 'USD',
        rateToBs: 50,
        effectiveDate: '2026-05-17T00:00:00.000Z',
      },
    ];
    const PICKED = pickExchangeRateForDateSV(RATES, 'USD', '2026-05-17');
    expect(PICKED?.rateToBs).toBe(50);
  });
});
