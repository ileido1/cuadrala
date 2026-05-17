import type { ExchangeRateRepository } from '../../domain/ports/exchange_rate_repository.js';

export class ListExchangeRatesByCountryUseCase {
  constructor(private readonly _exchangeRateRepository: ExchangeRateRepository) {}

  async executeSV(_countryCode: string): Promise<{ items: Awaited<ReturnType<ExchangeRateRepository['listByCountrySV']>> }> {
    const ITEMS = await this._exchangeRateRepository.listByCountrySV(_countryCode);
    return { items: ITEMS };
  }
}
