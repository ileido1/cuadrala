/** Tasas de cambio por país y moneda. */
export type ExchangeRateDTO = {
  readonly id: string;
  readonly countryCode: string;
  readonly currency: string; // 'USD' | 'EUR'
  readonly rateToBs: number;
  readonly effectiveDate: Date;
  readonly source: string | null;
  readonly updatedAt: Date;
};