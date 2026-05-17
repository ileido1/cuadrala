export type ExternalExchangeRateQuote = {
  currency: 'USD' | 'EUR';
  rateToBs: number;
  source: string;
};

export interface ExternalExchangeRateProvider {
  fetchVenezuelaQuotesSV(): Promise<ExternalExchangeRateQuote[]>;
}
