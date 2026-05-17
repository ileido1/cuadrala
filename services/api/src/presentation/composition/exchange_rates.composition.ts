import { ListExchangeRatesByCountryUseCase } from '../../application/use_cases/list_exchange_rates_by_country.use_case.js';
import { RefreshExchangeRatesUseCase } from '../../application/use_cases/refresh_exchange_rates.use_case.js';
import { DolarApiExchangeRateProvider } from '../../infrastructure/adapters/dolarapi_exchange_rate_provider.js';
import { PrismaExchangeRateRepository } from '../../infrastructure/adapters/prisma_exchange_rate_repository.js';

const EXCHANGE_RATE_REPOSITORY = new PrismaExchangeRateRepository();
const EXTERNAL_EXCHANGE_RATE_PROVIDER = new DolarApiExchangeRateProvider();

export const LIST_EXCHANGE_RATES_BY_COUNTRY_UC = new ListExchangeRatesByCountryUseCase(
  EXCHANGE_RATE_REPOSITORY,
);

export const REFRESH_EXCHANGE_RATES_UC = new RefreshExchangeRatesUseCase(
  EXCHANGE_RATE_REPOSITORY,
  EXTERNAL_EXCHANGE_RATE_PROVIDER,
);
