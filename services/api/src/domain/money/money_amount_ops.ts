import type { MoneyAmount } from './money_amount.js';
import { CurrencyMismatchError } from './money_errors.js';

export function assertSameCurrency(
  _left: MoneyAmount,
  _right: MoneyAmount,
): void {
  if (_left.currencyCode !== _right.currencyCode) {
    throw new CurrencyMismatchError(
      _left.currencyCode,
      _right.currencyCode,
    );
  }
}

export function addMoney(_left: MoneyAmount, _right: MoneyAmount): MoneyAmount {
  return _left.add(_right);
}

export function subtractMoney(
  _left: MoneyAmount,
  _right: MoneyAmount,
): MoneyAmount {
  return _left.subtract(_right);
}
