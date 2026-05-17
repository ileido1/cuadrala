import type { ExchangeRateDTO } from '../../domain/entities/payments/exchange_rate.entity.js';
import type { ExchangeRateRepository } from '../../domain/ports/exchange_rate_repository.js';

import { PRISMA } from '../prisma_client.js';
import { caracasCalendarDateSV } from '../prisma_money_fields.js';

function mapExchangeRateSV(_row: {
  id: string;
  countryCode: string;
  currency: string;
  rateToBs: bigint | number;
  effectiveDate: Date;
  source: string | null;
  updatedAt: Date;
}): ExchangeRateDTO {
  return {
    id: _row.id,
    countryCode: _row.countryCode,
    currency: _row.currency,
    rateToBs: typeof _row.rateToBs === 'bigint' ? Number(_row.rateToBs) : _row.rateToBs,
    effectiveDate: _row.effectiveDate,
    source: _row.source,
    updatedAt: _row.updatedAt,
  };
}

export class PrismaExchangeRateRepository implements ExchangeRateRepository {
  async listByCountrySV(_countryCode: string): Promise<ExchangeRateDTO[]> {
    const ROWS = await PRISMA.exchangeRate.findMany({
      where: { countryCode: _countryCode },
    });
    return ROWS.map(mapExchangeRateSV);
  }

  async findByCountryAndCurrencySV(
    _countryCode: string,
    _currency: string,
  ): Promise<ExchangeRateDTO | null> {
    const ROW = await PRISMA.exchangeRate.findFirst({
      where: { countryCode: _countryCode, currency: _currency },
      orderBy: { effectiveDate: 'desc' },
    });
    return ROW ? mapExchangeRateSV(ROW) : null;
  }

  async findByCountryCurrencyAndDateSV(
    _countryCode: string,
    _currency: string,
    _effectiveDate: Date,
  ): Promise<ExchangeRateDTO | null> {
    const ROW = await PRISMA.exchangeRate.findUnique({
      where: {
        countryCode_currency_effectiveDate: {
          countryCode: _countryCode,
          currency: _currency,
          effectiveDate: _effectiveDate,
        },
      },
    });
    return ROW ? mapExchangeRateSV(ROW) : null;
  }

  async upsertManySV(
    _rates: Array<{
      countryCode: string;
      currency: string;
      rateToBs: number;
      source: string;
    }>,
  ): Promise<ExchangeRateDTO[]> {
    const EFFECTIVE_DATE = caracasCalendarDateSV();
    const UPSERTED = await PRISMA.$transaction(
      _rates.map((_rate) =>
        PRISMA.exchangeRate.upsert({
          where: {
            countryCode_currency_effectiveDate: {
              countryCode: _rate.countryCode,
              currency: _rate.currency,
              effectiveDate: EFFECTIVE_DATE,
            },
          },
          update: { rateToBs: _rate.rateToBs, source: _rate.source },
          create: {
            countryCode: _rate.countryCode,
            currency: _rate.currency,
            rateToBs: _rate.rateToBs,
            source: _rate.source,
            effectiveDate: EFFECTIVE_DATE,
          },
        }),
      ),
    );
    return UPSERTED.map(mapExchangeRateSV);
  }
}
