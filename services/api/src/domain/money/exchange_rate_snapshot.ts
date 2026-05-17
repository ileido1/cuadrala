import type { CurrencyCode } from './currency_code.js';

/**
 * Tipo estructural para tasa de cambio (conversión en Wave 1 / MCP).
 * Sin lógica de conversión en Wave 0.
 */
export type ExchangeRateSnapshot = {
  readonly currencyCode: CurrencyCode;
  /** Unidades menores de BS por 1 unidad mayor de currencyCode (convención a fijar en MCP). */
  readonly rateBsMinorPerMajorUnit: bigint;
  readonly effectiveAt: Date;
};
