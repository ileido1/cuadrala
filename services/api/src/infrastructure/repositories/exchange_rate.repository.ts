import { PRISMA } from '../prisma_client.js';
import type { ExchangeRateDTO } from '../../domain/entities/exchange_rate.entity.js';

function mapExchangeRate(row: {
  id: string;
  countryCode: string;
  currency: string;
  rateToBs: bigint | number;
  source: string | null;
  updatedAt: Date;
}): ExchangeRateDTO {
  return {
    id: row.id,
    countryCode: row.countryCode,
    currency: row.currency,
    rateToBs: typeof row.rateToBs === 'bigint' ? Number(row.rateToBs) : row.rateToBs,
    source: row.source,
    updatedAt: row.updatedAt,
  };
}

export async function listByCountrySV(_countryCode: string): Promise<ExchangeRateDTO[]> {
  const ROWS = await PRISMA.exchangeRate.findMany({
    where: { countryCode: _countryCode },
  });
  return ROWS.map(mapExchangeRate);
}

export async function findByCountryAndCurrencySV(
  _countryCode: string,
  _currency: string,
): Promise<ExchangeRateDTO | null> {
  const ROW = await PRISMA.exchangeRate.findUnique({
    where: { countryCode_currency: { countryCode: _countryCode, currency: _currency } },
  });
  return ROW ? mapExchangeRate(ROW) : null;
}

export async function upsertManySV(_rates: Array<{
  countryCode: string;
  currency: string;
  rateToBs: number;
  source: string;
}>): Promise<ExchangeRateDTO[]> {
  const UPSERTED = await PRISMA.$transaction(
    _rates.map(r =>
      PRISMA.exchangeRate.upsert({
        where: { countryCode_currency: { countryCode: r.countryCode, currency: r.currency } },
        update: { rateToBs: r.rateToBs, source: r.source },
        create: { countryCode: r.countryCode, currency: r.currency, rateToBs: r.rateToBs, source: r.source },
      }),
    ),
  );
  return UPSERTED.map(mapExchangeRate);
}