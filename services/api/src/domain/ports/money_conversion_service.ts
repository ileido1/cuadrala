import type { ExchangeRateSnapshot } from '../money/exchange_rate_snapshot.js';
import type { CurrencyCode } from '../money/currency_code.js';
import type { MoneyAmount } from '../money/money_amount.js';

export interface MoneyConversionService {
  convertSV(
    _amount: MoneyAmount,
    _toCurrency: CurrencyCode,
    _rate: ExchangeRateSnapshot,
  ): MoneyAmount;

  toBsMinorSV(_amount: MoneyAmount, _rate: ExchangeRateSnapshot): bigint;

  convertSettlementToObligationSV(
    _settlement: MoneyAmount,
    _obligationCurrency: CurrencyCode,
    _settlementRate: ExchangeRateSnapshot,
    _obligationRate?: ExchangeRateSnapshot,
  ): MoneyAmount;
}
