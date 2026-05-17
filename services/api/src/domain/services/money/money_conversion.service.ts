import type { MoneyConversionService } from '../../ports/money_conversion_service.js';
import type { ExchangeRateSnapshot } from '../../money/exchange_rate_snapshot.js';
import type { CurrencyCode } from '../../money/currency_code.js';
import { MoneyAmount } from '../../money/money_amount.js';

/** Conversión monetaria pura (sin I/O). */
export class DefaultMoneyConversionService implements MoneyConversionService {
  convertSV(
    _amount: MoneyAmount,
    _toCurrency: CurrencyCode,
    _rate: ExchangeRateSnapshot,
  ): MoneyAmount {
    if (_amount.currencyCode === _toCurrency) {
      return _amount;
    }
    const BS_MINOR = this.toBsMinorSV(_amount, _rate);
    if (_toCurrency === 'BS') {
      return MoneyAmount.fromMinor('BS', BS_MINOR);
    }
    const TARGET_RATE = _rate.currencyCode === _toCurrency
      ? _rate
      : _rate;
    return this.fromBsMinorSV(BS_MINOR, _toCurrency, TARGET_RATE);
  }

  toBsMinorSV(_amount: MoneyAmount, _rate: ExchangeRateSnapshot): bigint {
    if (_amount.currencyCode === 'BS') {
      return _amount.amountMinor;
    }
    if (_rate.currencyCode !== _amount.currencyCode) {
      throw new Error('MONEDA_TASA_INCOMPATIBLE');
    }
    return (_amount.amountMinor * _rate.rateBsMinorPerMajorUnit + 50n) / 100n;
  }

  convertSettlementToObligationSV(
    _settlement: MoneyAmount,
    _obligationCurrency: CurrencyCode,
    _settlementRate: ExchangeRateSnapshot,
    _obligationRate?: ExchangeRateSnapshot,
  ): MoneyAmount {
    if (_settlement.currencyCode === _obligationCurrency) {
      return _settlement;
    }
    const BS_MINOR = this.toBsMinorSV(_settlement, _settlementRate);
    if (_obligationCurrency === 'BS') {
      return MoneyAmount.fromMinor('BS', BS_MINOR);
    }
    const OBLIGATION_RATE = _obligationRate
      ?? (_obligationCurrency === _settlementRate.currencyCode
        ? _settlementRate
        : undefined);
    if (OBLIGATION_RATE === undefined) {
      throw new Error('MONEDA_TASA_INCOMPATIBLE');
    }
    return this.fromBsMinorSV(BS_MINOR, _obligationCurrency, OBLIGATION_RATE);
  }

  private fromBsMinorSV(
    _bsMinor: bigint,
    _targetCurrency: CurrencyCode,
    _rate: ExchangeRateSnapshot,
  ): MoneyAmount {
    if (_targetCurrency === 'BS') {
      return MoneyAmount.fromMinor('BS', _bsMinor);
    }
    if (_rate.currencyCode !== _targetCurrency) {
      throw new Error('MONEDA_TASA_INCOMPATIBLE');
    }
    const TARGET_MINOR = (
      _bsMinor * 100n + _rate.rateBsMinorPerMajorUnit / 2n
    ) / _rate.rateBsMinorPerMajorUnit;
    return MoneyAmount.fromMinor(_targetCurrency, TARGET_MINOR);
  }
}
