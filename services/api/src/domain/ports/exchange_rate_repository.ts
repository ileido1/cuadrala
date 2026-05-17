import type { ExchangeRateDTO } from '../entities/payments/exchange_rate.entity.js';

export interface ExchangeRateRepository {
  /** Lista todas las tasas de un país. */
  listByCountrySV(_countryCode: string): Promise<ExchangeRateDTO[]>;

  /** Obtiene la tasa más reciente para país/moneda. */
  findByCountryAndCurrencySV(_countryCode: string, _currency: string): Promise<ExchangeRateDTO | null>;

  /** Tasa para un día calendario concreto (REQ-MCP-017). */
  findByCountryCurrencyAndDateSV(
    _countryCode: string,
    _currency: string,
    _effectiveDate: Date,
  ): Promise<ExchangeRateDTO | null>;

  /** Upsert una o más tasas. */
  upsertManySV(_rates: Array<{
    countryCode: string;
    currency: string;
    rateToBs: number;
    source: string;
  }>): Promise<ExchangeRateDTO[]>;
}