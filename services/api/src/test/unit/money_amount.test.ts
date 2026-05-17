import { describe, expect, it } from 'vitest';
import { parseCurrencyCode, isCurrencyCode } from '../../domain/money/currency_code.js';
import { MoneyAmount } from '../../domain/money/money_amount.js';
import {
  addMoney,
  subtractMoney,
} from '../../domain/money/money_amount_ops.js';
import {
  CurrencyMismatchError,
  InvalidCurrencyCodeError,
  InvalidMoneyAmountError,
} from '../../domain/money/money_errors.js';

describe('CurrencyCode', () => {
  it('should accept BS, USD and EUR when parsing', () => {
    expect(parseCurrencyCode('USD')).toBe('USD');
    expect(parseCurrencyCode('BS')).toBe('BS');
    expect(parseCurrencyCode('EUR')).toBe('EUR');
  });

  it('should reject unsupported codes when parsing', () => {
    expect(() => parseCurrencyCode('VES')).toThrow(InvalidCurrencyCodeError);
  });

  it('should return false for isCurrencyCode when code is invalid', () => {
    expect(isCurrencyCode('VES')).toBe(false);
    expect(isCurrencyCode('USD')).toBe(true);
  });
});

describe('MoneyAmount', () => {
  it('should add two amounts with the same currency', () => {
    const LEFT = MoneyAmount.of('USD', 5000n);
    const RIGHT = MoneyAmount.of('USD', 2500n);
    const TOTAL = addMoney(LEFT, RIGHT);
    expect(TOTAL.amountMinor).toBe(7500n);
    expect(TOTAL.currencyCode).toBe('USD');
  });

  it('should reject cross-currency add via addMoney', () => {
    const USD = MoneyAmount.of('USD', 5000n);
    const BS = MoneyAmount.of('BS', 2750000n);
    expect(() => addMoney(USD, BS)).toThrow(CurrencyMismatchError);
  });

  it('should reject cross-currency add on instance method', () => {
    const USD = MoneyAmount.of('USD', 5000n);
    const BS = MoneyAmount.of('BS', 100n);
    expect(() => USD.add(BS)).toThrow(CurrencyMismatchError);
  });

  it('should subtract same-currency amounts', () => {
    const LEFT = MoneyAmount.of('USD', 5000n);
    const RIGHT = MoneyAmount.of('USD', 2000n);
    const RESULT = subtractMoney(LEFT, RIGHT);
    expect(RESULT.amountMinor).toBe(3000n);
    expect(RESULT.currencyCode).toBe('USD');
  });

  it('should reject subtract when result would be negative', () => {
    const LEFT = MoneyAmount.of('USD', 1000n);
    const RIGHT = MoneyAmount.of('USD', 2000n);
    expect(() => subtractMoney(LEFT, RIGHT)).toThrow(InvalidMoneyAmountError);
  });

  it('should reject invalid currency in MoneyAmount.of', () => {
    expect(() => MoneyAmount.of('VES', 100n)).toThrow(
      InvalidCurrencyCodeError,
    );
  });

  it('should accept amountMinor from major units semantics (85.00 USD)', () => {
    const AMOUNT = MoneyAmount.fromMajorUnits('USD', 85);
    expect(AMOUNT.amountMinor).toBe(8500n);
    expect(AMOUNT.currencyCode).toBe('USD');
  });

  it('should reject negative amountMinor in fromMinor', () => {
    expect(() => MoneyAmount.fromMinor('USD', -1n)).toThrow(
      InvalidMoneyAmountError,
    );
  });

  it('should report equals for same minor and currency', () => {
    const A = MoneyAmount.of('EUR', 100n);
    const B = MoneyAmount.of('EUR', 100n);
    expect(A.equals(B)).toBe(true);
    expect(A.equals(MoneyAmount.of('EUR', 99n))).toBe(false);
  });
});
