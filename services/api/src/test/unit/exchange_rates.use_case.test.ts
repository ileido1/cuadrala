import { describe, expect, it, vi } from 'vitest';

import { AppError } from '../../domain/errors/app_error.js';
import { ListExchangeRatesByCountryUseCase } from '../../application/use_cases/list_exchange_rates_by_country.use_case.js';
import { RefreshExchangeRatesUseCase } from '../../application/use_cases/refresh_exchange_rates.use_case.js';

describe('ListExchangeRatesByCountryUseCase', () => {
  it('should return items from repository', async () => {
    const REPO = {
      listByCountrySV: vi.fn().mockResolvedValue([
        { countryCode: 'VE', currency: 'USD', rateToBs: 50, source: 'test' },
      ]),
      findByCountryAndCurrencySV: vi.fn(),
      upsertManySV: vi.fn(),
    };
    const UC = new ListExchangeRatesByCountryUseCase(REPO);

    const RESULT = await UC.executeSV('VE');

    expect(REPO.listByCountrySV).toHaveBeenCalledWith('VE');
    expect(RESULT.items).toHaveLength(1);
  });
});

describe('RefreshExchangeRatesUseCase', () => {
  it('should upsert quotes from external provider', async () => {
    const REPO = {
      listByCountrySV: vi.fn(),
      findByCountryAndCurrencySV: vi.fn(),
      upsertManySV: vi.fn().mockResolvedValue([
        { countryCode: 'VE', currency: 'USD', rateToBs: 50, source: 'dolarapi.com' },
      ]),
    };
    const PROVIDER = {
      fetchVenezuelaQuotesSV: vi.fn().mockResolvedValue([
        { currency: 'USD', rateToBs: 50, source: 'dolarapi.com' },
      ]),
    };
    const UC = new RefreshExchangeRatesUseCase(REPO, PROVIDER);

    const RESULT = await UC.executeSV('VE');

    expect(PROVIDER.fetchVenezuelaQuotesSV).toHaveBeenCalled();
    expect(REPO.upsertManySV).toHaveBeenCalledWith([
      {
        countryCode: 'VE',
        currency: 'USD',
        rateToBs: 50,
        source: 'dolarapi.com',
      },
    ]);
    expect(RESULT.items).toHaveLength(1);
  });

  it('should throw when external provider returns no quotes', async () => {
    const REPO = {
      listByCountrySV: vi.fn(),
      findByCountryAndCurrencySV: vi.fn(),
      upsertManySV: vi.fn(),
    };
    const PROVIDER = {
      fetchVenezuelaQuotesSV: vi.fn().mockResolvedValue([]),
    };
    const UC = new RefreshExchangeRatesUseCase(REPO, PROVIDER);

    await expect(UC.executeSV('VE')).rejects.toBeInstanceOf(AppError);
    await expect(UC.executeSV('VE')).rejects.toMatchObject({
      code: 'TASAS_NO_DISPONIBLES',
    });
  });
});
