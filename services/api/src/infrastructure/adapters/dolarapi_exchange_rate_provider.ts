import { AppError } from '../../domain/errors/app_error.js';
import type {
  ExternalExchangeRateProvider,
  ExternalExchangeRateQuote,
} from '../../domain/ports/external_exchange_rate_provider.js';

type DolarApiRow = {
  moneda: string;
  promedio: number | null;
  fuente: string;
};

export class DolarApiExchangeRateProvider implements ExternalExchangeRateProvider {
  async fetchVenezuelaQuotesSV(): Promise<ExternalExchangeRateQuote[]> {
    const RESP = await fetch('https://ve.dolarapi.com/v1/cotizaciones');
    if (!RESP.ok) {
      throw new AppError(
        'TASAS_NO_DISPONIBLES',
        'No se pudo obtener las tasas de cambio.',
        502,
      );
    }

    const RAW = (await RESP.json()) as DolarApiRow[];
    const QUOTES: ExternalExchangeRateQuote[] = [];

    const USD = RAW.find((_r) => _r.moneda === 'USD');
    if (USD?.promedio != null) {
      QUOTES.push({
        currency: 'USD',
        rateToBs: USD.promedio,
        source: 'dolarapi.com',
      });
    }

    const EUR = RAW.find((_r) => _r.moneda === 'EUR');
    if (EUR?.promedio != null) {
      QUOTES.push({
        currency: 'EUR',
        rateToBs: EUR.promedio,
        source: 'dolarapi.com',
      });
    }

    return QUOTES;
  }
}
