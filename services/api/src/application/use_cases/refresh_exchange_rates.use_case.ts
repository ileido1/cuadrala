import { AppError } from '../../domain/errors/app_error.js';
import type { ExchangeRateRepository } from '../../domain/ports/exchange_rate_repository.js';
import type { ExternalExchangeRateProvider } from '../../domain/ports/external_exchange_rate_provider.js';

export class RefreshExchangeRatesUseCase {
  constructor(
    private readonly _exchangeRateRepository: ExchangeRateRepository,
    private readonly _externalProvider: ExternalExchangeRateProvider,
  ) {}

  async executeSV(_countryCode: string): Promise<{
    items: Awaited<ReturnType<ExchangeRateRepository['listByCountrySV']>>;
  }> {
    const QUOTES = await this._externalProvider.fetchVenezuelaQuotesSV();
    if (QUOTES.length === 0) {
      throw new AppError(
        'TASAS_NO_DISPONIBLES',
        'No se encontraron tasas disponibles.',
        422,
      );
    }

    const UPDATED = await this._exchangeRateRepository.upsertManySV(
      QUOTES.map((_q) => ({
        countryCode: _countryCode,
        currency: _q.currency,
        rateToBs: _q.rateToBs,
        source: _q.source,
      })),
    );

    return { items: UPDATED };
  }
}
