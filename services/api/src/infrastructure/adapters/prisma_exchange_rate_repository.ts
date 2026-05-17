import type { ExchangeRateDTO } from '../../domain/entities/payments/exchange_rate.entity.js';
import type { ExchangeRateRepository } from '../../domain/ports/exchange_rate_repository.js';

import { PRISMA } from '../prisma_client.js';

function mapExchangeRateSV(_row: {
  id: string;
  countryCode: string;
  currency: string;
  rateToBs: bigint | number;
  source: string | null;
  updatedAt: Date;
}): ExchangeRateDTO {
  return {
    id: _row.id,
    countryCode: _row.countryCode,
    currency: _row.currency,
    rateToBs: typeof _row.rateToBs === 'bigint' ? Number(_row.rateToBs) : _row.rateToBs,
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
    const ROW = await PRISMA.exchangeRate.findUnique({
      where: { countryCode_currency: { countryCode: _countryCode, currency: _currency } },
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
    const UPSERTED = await PRISMA.$transaction(
      _rates.map((_rate) =>
        PRISMA.exchangeRate.upsert({
          where: {
            countryCode_currency: {
              countryCode: _rate.countryCode,
              currency: _rate.currency,
            },
          },
          update: { rateToBs: _rate.rateToBs, source: _rate.source },
          create: {
            countryCode: _rate.countryCode,
            currency: _rate.currency,
            rateToBs: _rate.rateToBs,
            source: _rate.source,
          },
        }),
      ),
    );
    return UPSERTED.map(mapExchangeRateSV);
  }
}
