'use client';

import {
  formatCentsWithCurrency,
  type CurrencyCode,
} from '~/lib/format-money';

export function SettlementConversionCard({
  obligationMinor,
  obligationCurrency,
  settlementMinor,
  settlementCurrency,
  obligationRateToBs,
  settlementRateToBs,
  reservationDateIso,
  loading,
  error,
  contextLabel = 'Cobro en reserva',
}: {
  obligationMinor: number;
  obligationCurrency: CurrencyCode;
  settlementMinor: number;
  settlementCurrency: CurrencyCode;
  obligationRateToBs: number;
  settlementRateToBs: number;
  reservationDateIso: string;
  loading?: boolean;
  error?: string | null;
  contextLabel?: string;
}) {
  if (loading) {
    return (
      <div className="rounded-xl border border-outline bg-surface-container/40 px-4 py-3 text-sm text-muted">
        Cargando tasa de cambio…
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
        {error}
      </div>
    );
  }

  const RATE_LABEL =
    obligationCurrency === 'BS'
      ? `1 ${settlementCurrency} = ${settlementRateToBs.toLocaleString('es-VE', { minimumFractionDigits: 2, maximumFractionDigits: 4 })} Bs`
      : `1 ${obligationCurrency} = ${obligationRateToBs.toLocaleString('es-VE', { minimumFractionDigits: 2, maximumFractionDigits: 4 })} Bs`;

  return (
    <div className="rounded-xl border border-sky-200 bg-sky-50/80 px-4 py-3 space-y-2">
      <p className="text-xs font-semibold uppercase tracking-wider text-sky-800">
        Conversión a {settlementCurrency}
      </p>
      <p className="text-sm text-sky-900">
        <span className="text-muted">{contextLabel}:</span>{' '}
        <strong>
          {formatCentsWithCurrency(obligationMinor, obligationCurrency)}
        </strong>
      </p>
      <p className="text-lg font-bold tabular-nums text-sky-950">
        {formatCentsWithCurrency(settlementMinor, settlementCurrency)}
      </p>
      <dl className="grid grid-cols-1 gap-1 text-xs text-sky-800/90 border-t border-sky-200/80 pt-2">
        <div className="flex justify-between gap-2">
          <dt>Tasa ({reservationDateIso})</dt>
          <dd className="font-medium text-right">{RATE_LABEL}</dd>
        </div>
        <div className="flex justify-between gap-2">
          <dt>Fecha del cobro</dt>
          <dd className="font-medium">{reservationDateIso}</dd>
        </div>
      </dl>
    </div>
  );
}
