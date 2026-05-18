export type CurrencyCode = 'BS' | 'USD' | 'EUR';

export const CURRENCY_OPTIONS: { value: CurrencyCode; label: string }[] = [
  { value: 'BS', label: 'Bolívares (Bs.)' },
  { value: 'USD', label: 'Dólares (US$)' },
  { value: 'EUR', label: 'Euros (€)' },
];

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

/** Formatea un monto en unidades mayores para mostrar en inputs (sin símbolo). */
export function formatMajorAmountInput(
  _major: number,
  _currency: CurrencyCode,
): string {
  return _major.toLocaleString(LOCALE_BY_CURRENCY[_currency], {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

/** Convierte centavos a texto formateado para input (sin símbolo). */
export function centsToFormattedMajorInput(
  _cents: number,
  _currency: CurrencyCode,
): string {
  return formatMajorAmountInput(_cents / 100, _currency);
}

export function majorAmountPlaceholder(_currency: CurrencyCode): string {
  return formatMajorAmountInput(8500, _currency);
}

/** Parsea texto de input (8500, 8.500,00, 8500.50) a unidades mayores. */
export function parseMajorAmountInput(_raw: string): number | null {
  const _trimmed = _raw.trim();
  if (_trimmed === '') {
    return null;
  }

  let _s = _trimmed.replace(/[^\d,.]/g, '');
  if (_s === '') {
    return null;
  }

  const _lastComma = _s.lastIndexOf(',');
  const _lastDot = _s.lastIndexOf('.');

  if (_lastComma > _lastDot) {
    _s =
      _s.slice(0, _lastComma).replace(/[.,]/g, '')
      + '.'
      + _s.slice(_lastComma + 1);
  } else if (_lastDot > _lastComma) {
    const _afterDot = _s.length - _lastDot - 1;
    if (_afterDot <= 2 && _s.split('.').length === 2) {
      _s =
        _s.slice(0, _lastDot).replace(/[.,]/g, '')
        + '.'
        + _s.slice(_lastDot + 1);
    } else {
      _s = _s.replace(/[.,]/g, '');
    }
  } else {
    _s = _s.replace(/[.,]/g, '');
  }

  const _n = parseFloat(_s);
  return Number.isNaN(_n) ? null : _n;
}

/** Solo dígitos y separadores decimales mientras se escribe. */
export function sanitizeMoneyInput(_raw: string): string {
  return _raw.replace(/[^\d,.]/g, '');
}
