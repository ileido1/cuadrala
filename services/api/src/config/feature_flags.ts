/** MCP Fase 1: dual-write *Minor y agregación por moneda de pricing. */
export function isMultiCurrencyPaymentsEnabledSV(): boolean {
  return process.env.MULTI_CURRENCY_PAYMENTS === 'true';
}

/** MCP Fase 2: libro mayor append-only por reserva. */
export function isReservationPaymentLedgerEnabledSV(): boolean {
  return process.env.RESERVATION_PAYMENT_LEDGER === 'true';
}
