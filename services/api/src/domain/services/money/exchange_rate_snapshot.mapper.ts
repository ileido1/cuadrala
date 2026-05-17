import type { ExchangeRateDTO } from '../../entities/payments/exchange_rate.entity.js';
import type { ExchangeRateSnapshot } from '../../money/exchange_rate_snapshot.js';
import { parseCurrencyCode } from '../../money/currency_code.js';

export function exchangeRateDtoToSnapshotSV(
  _dto: ExchangeRateDTO,
): ExchangeRateSnapshot {
  return {
    currencyCode: parseCurrencyCode(_dto.currency),
    rateBsMinorPerMajorUnit: BigInt(Math.round(_dto.rateToBs * 100)),
    effectiveAt: _dto.effectiveDate,
  };
}
