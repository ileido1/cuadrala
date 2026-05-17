export type CurrencyCode = 'BS' | 'USD' | 'EUR';

const CURRENCY_SYMBOL: Record<CurrencyCode, string> = {
  BS: 'Bs.',
  USD: 'US$',
  EUR: '€',
};

const LOCALE_BY_CURRENCY: Record<CurrencyCode, string> = {
  BS: 'es-VE',
  USD: 'es-VE',
  EUR: 'es-VE',
};

export function resolveCurrencyCode(
  _pricingCurrency?: string | null,
  _displayCurrency?: string | null,
): CurrencyCode {
  const CODE = _pricingCurrency ?? _displayCurrency ?? 'BS';
  if (CODE === 'USD' || CODE === 'EUR' || CODE === 'BS') {
    return CODE;
  }
  return 'BS';
}

/** Formatea unidades menores (centavos/céntimos) según moneda de la sede. */
export function formatMoneyFromMinor(
  _amountMinor: number | bigint,
  _currency: CurrencyCode,
): string {
  const MINOR = typeof _amountMinor === 'bigint' ? Number(_amountMinor) : _amountMinor;
  const MAJOR = MINOR / 100;
  const FORMATTED = MAJOR.toLocaleString(LOCALE_BY_CURRENCY[_currency], {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
  return `${CURRENCY_SYMBOL[_currency]} ${FORMATTED}`;
}

/** Alias legacy: centavos con moneda de sede (antes asumía ARS/$). */
export function formatCentsWithCurrency(
  _cents: number,
  _currency: CurrencyCode,
): string {
  return formatMoneyFromMinor(_cents, _currency);
}

/** Montos en unidades mayores (p. ej. amountTotal de transacciones legacy). */
export function formatMoneyFromMajor(
  _amountMajor: number,
  _currency: CurrencyCode,
): string {
  return formatMoneyFromMinor(Math.round(_amountMajor * 100), _currency);
}

export function currencySymbol(_currency: CurrencyCode): string {
  return CURRENCY_SYMBOL[_currency];
}

export function pricePerHourLabel(_currency: CurrencyCode): string {
  return `${currencySymbol(_currency)}/hora`;
}
