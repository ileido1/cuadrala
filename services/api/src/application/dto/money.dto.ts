import type { CurrencyCode } from '../../domain/money/currency_code.js';

export type MoneyAmountDTO = {
  amountMinor: string;
  currencyCode: CurrencyCode;
};

export function moneyAmountDtoFromMinorSV(
  _currencyCode: CurrencyCode | string,
  _amountMinor: bigint,
): MoneyAmountDTO {
  return {
    amountMinor: _amountMinor.toString(),
    currencyCode: _currencyCode as CurrencyCode,
  };
}
