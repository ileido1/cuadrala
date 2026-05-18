import type { CurrencyCode } from '~/lib/format-money';

/** rateToBs del API: Bs por 1 unidad mayor (ej. 50 = Bs 50 por US$ 1). */
export function rateBsMinorPerMajorUnit(_rateToBs: number): number {
  return Math.round(_rateToBs * 100);
}

export function toBsMinorSV(
  _amountMinor: number,
  _currency: CurrencyCode,
  _rateToBs: number,
): number {
  if (_currency === 'BS') {
    return _amountMinor;
  }
  const RATE_MINOR = rateBsMinorPerMajorUnit(_rateToBs);
  return Number(
    (BigInt(_amountMinor) * BigInt(RATE_MINOR) + 50n) / 100n,
  );
}

export function fromBsMinorSV(
  _bsMinor: number,
  _targetCurrency: CurrencyCode,
  _rateToBs: number,
): number {
  if (_targetCurrency === 'BS') {
    return _bsMinor;
  }
  const RATE_MINOR = rateBsMinorPerMajorUnit(_rateToBs);
  return Number(
    (BigInt(_bsMinor) * 100n + BigInt(RATE_MINOR) / 2n) / BigInt(RATE_MINOR),
  );
}

/** Convierte un monto minor entre monedas usando tasas a Bs del día. */
export function convertMinorBetweenCurrenciesSV(
  _amountMinor: number,
  _from: CurrencyCode,
  _to: CurrencyCode,
  _fromRateToBs: number,
  _toRateToBs: number,
): number {
  if (_from === _to) {
    return _amountMinor;
  }
  const BS_MINOR = toBsMinorSV(_amountMinor, _from, _fromRateToBs);
  return fromBsMinorSV(BS_MINOR, _to, _toRateToBs);
}

export function localCalendarDateIsoSV(
  _scheduledAt: string,
  _timezone = 'America/Caracas',
): string {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: _timezone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(new Date(_scheduledAt));
}

export interface ExchangeRateRow {
  currency: string;
  rateToBs: number;
  effectiveDate?: string;
  source?: string | null;
}

/** Tasa del día de la reserva; si no hay fila exacta, usa la más reciente de esa moneda. */
export function pickExchangeRateForDateSV(
  _rates: ExchangeRateRow[],
  _currency: CurrencyCode,
  _effectiveDateIso: string,
): ExchangeRateRow | null {
  if (_currency === 'BS') {
    return { currency: 'BS', rateToBs: 1 };
  }

  const FOR_CURRENCY = _rates.filter((r) => r.currency === _currency);
  if (FOR_CURRENCY.length === 0) {
    return null;
  }

  const EXACT = FOR_CURRENCY.find((r) => {
    const DATE = r.effectiveDate?.slice(0, 10);
    return DATE === _effectiveDateIso;
  });
  if (EXACT) {
    return EXACT;
  }

  const SORTED = [...FOR_CURRENCY].sort((a, b) => {
    const DA = a.effectiveDate ?? '';
    const DB = b.effectiveDate ?? '';
    return DB.localeCompare(DA);
  });
  return SORTED[0] ?? null;
}
