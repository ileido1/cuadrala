'use client';

import { useEffect, useMemo, useState } from 'react';

import { apiClient } from '~/lib/api-client';
import {
  formatCentsWithCurrency,
  resolveCurrencyCode,
  type CurrencyCode,
} from '~/lib/format-money';
import {
  convertMinorBetweenCurrenciesSV,
  localCalendarDateIsoSV,
  pickExchangeRateForDateSV,
  type ExchangeRateRow,
} from '~/lib/money-conversion';
import { PendingPaymentDetails } from '~/components/payments/pending-payment-details';
import { SettlementConversionCard } from '~/components/payments/settlement-conversion-card';
import type { VenuePendingTransaction, VenuePaymentMethod } from '~/types/api';

interface PendingPaymentReviewDialogProps {
  open: boolean;
  transaction: VenuePendingTransaction;
  venueId: string;
  pricingCurrency?: string | null;
  displayCurrency?: string | null;
  countryCode?: string;
  receiptUrl?: string | null;
  venueTimezone?: string;
  onClose: () => void;
  onSuccess: () => void;
}

function parsePaymentMethodsResponse(_data: unknown): VenuePaymentMethod[] {
  if (Array.isArray(_data)) return _data as VenuePaymentMethod[];
  if (
    _data !== null
    && typeof _data === 'object'
    && Array.isArray((_data as { items?: unknown }).items)
  ) {
    return (_data as { items: VenuePaymentMethod[] }).items;
  }
  return [];
}

function parseExchangeRatesResponse(_data: unknown): ExchangeRateRow[] {
  if (Array.isArray(_data)) return _data as ExchangeRateRow[];
  if (
    _data !== null
    && typeof _data === 'object'
    && Array.isArray((_data as { items?: unknown }).items)
  ) {
    return (_data as { items: ExchangeRateRow[] }).items;
  }
  return [];
}

function obligationMinorFromTx(_tx: VenuePendingTransaction): number | null {
  if (_tx.obligationAmountMinor !== null) {
    const minor = Number(_tx.obligationAmountMinor);
    if (Number.isFinite(minor) && minor > 0) return minor;
  }
  const major = Number(_tx.amountTotal);
  if (Number.isFinite(major) && major > 0) {
    return Math.round(major * 100);
  }
  return null;
}

function resolveSettlement(
  _tx: VenuePendingTransaction,
  _obligationCurrency: CurrencyCode,
  _settlementCurrency: CurrencyCode,
  _settlementMinor: number | null,
): { amountMinor: string; currencyCode: CurrencyCode } | null {
  if (_settlementMinor !== null && _settlementMinor > 0) {
    return {
      amountMinor: String(_settlementMinor),
      currencyCode: _settlementCurrency,
    };
  }
  const minor = obligationMinorFromTx(_tx);
  if (minor === null) return null;
  return { amountMinor: String(minor), currencyCode: _obligationCurrency };
}

type FxSnapshot =
  | { kind: 'none' }
  | {
      kind: 'ready';
      settlementMinor: number;
      obligationRateToBs: number;
      settlementRateToBs: number;
      bookingDateIso: string;
      settlementCurrency: CurrencyCode;
    }
  | { kind: 'missing_rate'; message: string };

export function PendingPaymentReviewDialog({
  open,
  transaction,
  venueId,
  pricingCurrency,
  displayCurrency,
  countryCode = 'VE',
  receiptUrl,
  venueTimezone = 'America/Caracas',
  onClose,
  onSuccess,
}: PendingPaymentReviewDialogProps) {
  const obligationCurrency = resolveCurrencyCode(
    transaction.pricingCurrency ?? pricingCurrency,
    displayCurrency,
  ) as CurrencyCode;

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [paymentMethods, setPaymentMethods] = useState<VenuePaymentMethod[]>([]);
  const [exchangeRates, setExchangeRates] = useState<ExchangeRateRow[]>([]);
  const [ratesLoading, setRatesLoading] = useState(false);
  const [ratesError, setRatesError] = useState<string | null>(null);

  const isCash = transaction.paymentMethodType === 'CASH';
  const hasBookingContext =
    (transaction.reservationId !== null && transaction.reservationId !== '')
    || (transaction.matchId !== null && transaction.matchId !== '');

  const matchedMethod = useMemo(() => {
    if (transaction.venuePaymentMethodId) {
      const byId = paymentMethods.find(
        (pm) => pm.id === transaction.venuePaymentMethodId,
      );
      if (byId) return byId;
    }
    if (transaction.paymentMethodType) {
      return paymentMethods.find(
        (pm) => pm.type === transaction.paymentMethodType,
      );
    }
    return paymentMethods[0];
  }, [paymentMethods, transaction]);

  const settlementCurrency = resolveCurrencyCode(
    matchedMethod?.settlementCurrency,
    obligationCurrency,
  ) as CurrencyCode;

  const obligationMinor = obligationMinorFromTx(transaction);

  const bookingDateIso = useMemo(
    () => localCalendarDateIsoSV(transaction.scheduledAt, venueTimezone),
    [transaction.scheduledAt, venueTimezone],
  );

  const fxSnapshot: FxSnapshot = useMemo(() => {
    if (
      obligationMinor === null
      || settlementCurrency === obligationCurrency
    ) {
      return { kind: 'none' };
    }

    const OBLIGATION_RATE = pickExchangeRateForDateSV(
      exchangeRates,
      obligationCurrency,
      bookingDateIso,
    );
    const SETTLEMENT_RATE = pickExchangeRateForDateSV(
      exchangeRates,
      settlementCurrency,
      bookingDateIso,
    );

    if (!OBLIGATION_RATE || !SETTLEMENT_RATE) {
      const MISSING =
        !OBLIGATION_RATE && obligationCurrency !== 'BS'
          ? obligationCurrency
          : settlementCurrency;
      return {
        kind: 'missing_rate',
        message: `No hay tasa de cambio para ${MISSING} en la fecha del cobro (${bookingDateIso}). Actualizá tasas en Ajustes.`,
      };
    }

    const SETTLEMENT_MINOR = convertMinorBetweenCurrenciesSV(
      obligationMinor,
      obligationCurrency,
      settlementCurrency,
      OBLIGATION_RATE.rateToBs,
      SETTLEMENT_RATE.rateToBs,
    );

    return {
      kind: 'ready',
      settlementMinor: SETTLEMENT_MINOR,
      obligationRateToBs: OBLIGATION_RATE.rateToBs,
      settlementRateToBs: SETTLEMENT_RATE.rateToBs,
      bookingDateIso,
      settlementCurrency,
    };
  }, [
    obligationMinor,
    obligationCurrency,
    settlementCurrency,
    exchangeRates,
    bookingDateIso,
  ]);

  const settlement = resolveSettlement(
    transaction,
    obligationCurrency,
    settlementCurrency,
    fxSnapshot.kind === 'ready' ? fxSnapshot.settlementMinor : null,
  );

  const canConfirm =
    fxSnapshot.kind !== 'missing_rate' && settlement !== null;

  useEffect(() => {
    if (!open) return;
    setError(null);
    setRatesError(null);
    setRatesLoading(true);
    apiClient.venues.paymentMethods
      .listAll(venueId)
      .then((r) => {
        const items = parsePaymentMethodsResponse(r.data?.data);
        setPaymentMethods(items.filter((pm) => pm.isActive !== false && Boolean(pm.id)));
      })
      .catch(() => setPaymentMethods([]));
    apiClient.exchangeRates
      .list(countryCode)
      .then((r) => setExchangeRates(parseExchangeRatesResponse(r.data?.data)))
      .catch(() => {
        setRatesError('No se pudieron cargar las tasas de cambio.');
        setExchangeRates([]);
      })
      .finally(() => setRatesLoading(false));
  }, [open, venueId, countryCode]);

  if (!open) return null;

  const handleConfirm = async () => {
    if (!canConfirm) return;
    setLoading(true);
    setError(null);
    try {
      const body: {
        venuePaymentMethodId?: string;
        settlementAmount?: { amountMinor: string; currencyCode: string };
      } = {};

      const UUID_RE =
        /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

      if (
        transaction.venuePaymentMethodId !== null
        && UUID_RE.test(transaction.venuePaymentMethodId)
      ) {
        body.venuePaymentMethodId = transaction.venuePaymentMethodId;
      } else {
        const methodsByType = transaction.paymentMethodType
          ? paymentMethods.filter(
              (pm) => pm.type === transaction.paymentMethodType,
            )
          : paymentMethods;
        const preferred = methodsByType[0] ?? paymentMethods[0];
        if (preferred?.id && UUID_RE.test(preferred.id)) {
          body.venuePaymentMethodId = preferred.id;
        }
      }

      if (hasBookingContext) {
        if (settlement === null) {
          throw new Error('No se pudo determinar el monto del pago.');
        }
        body.settlementAmount = settlement;
      } else if (settlement !== null && body.venuePaymentMethodId !== undefined) {
        body.settlementAmount = settlement;
      }

      await apiClient.transactions.confirmManual(transaction.id, body);
      onSuccess();
      onClose();
    } catch (err: unknown) {
      let message = 'No se pudo confirmar el pago.';
      if (err instanceof Error && 'response' in err) {
        message =
          (err as { response?: { data?: { message?: string } } }).response?.data
            ?.message ?? message;
      } else if (err instanceof Error && err.message) {
        message = err.message;
      }
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  const amountLabel =
    settlement !== null
      ? formatCentsWithCurrency(
          Number(settlement.amountMinor),
          settlement.currencyCode,
        )
      : transaction.amountTotal;

  const contextFxLabel =
    transaction.matchId !== null && transaction.matchId !== ''
      ? 'Cuota en partida'
      : 'Cobro en reserva';

  return (
    <div className="fixed inset-0 z-[90] flex items-end justify-center bg-black/50 p-0 sm:items-center sm:p-4">
      <div
        className="flex max-h-[92vh] w-full max-w-lg flex-col overflow-hidden rounded-t-2xl bg-white shadow-2xl sm:rounded-2xl"
        role="dialog"
        aria-labelledby="review-payment-title"
      >
        <div className="border-b border-outline px-5 py-4">
          <h2
            id="review-payment-title"
            className="text-lg font-bold text-[#0F172A]"
          >
            Validar pago del jugador
          </h2>
          <p className="mt-1 text-sm text-muted">
            {isCash
              ? 'El jugador registró un pago en efectivo. Verificá que recibiste el monto y confirmá o rechazá.'
              : 'El jugador registró el pago y subió el comprobante. Revisá los datos y confirmá o rechazá.'}
          </p>
        </div>

        <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4">
          <div className="rounded-xl border border-emerald-100 bg-emerald-50/80 px-4 py-3">
            <p className="text-xs font-semibold uppercase tracking-wide text-emerald-800">
              {fxSnapshot.kind === 'ready'
                ? `Monto a liquidar (${settlementCurrency})`
                : 'Monto reportado por el jugador'}
            </p>
            <p className="mt-1 text-2xl font-bold tabular-nums text-emerald-950">
              {amountLabel}
            </p>
          </div>

          {fxSnapshot.kind === 'ready' && obligationMinor !== null ? (
            <SettlementConversionCard
              obligationMinor={obligationMinor}
              obligationCurrency={obligationCurrency}
              settlementMinor={fxSnapshot.settlementMinor}
              settlementCurrency={fxSnapshot.settlementCurrency}
              obligationRateToBs={fxSnapshot.obligationRateToBs}
              settlementRateToBs={fxSnapshot.settlementRateToBs}
              reservationDateIso={fxSnapshot.bookingDateIso}
              loading={ratesLoading}
              error={ratesError}
              contextLabel={contextFxLabel}
            />
          ) : fxSnapshot.kind === 'missing_rate' ? (
            <SettlementConversionCard
              obligationMinor={obligationMinor ?? 0}
              obligationCurrency={obligationCurrency}
              settlementMinor={0}
              settlementCurrency={settlementCurrency}
              obligationRateToBs={1}
              settlementRateToBs={1}
              reservationDateIso={bookingDateIso}
              error={fxSnapshot.message}
            />
          ) : null}

          <PendingPaymentDetails
            transaction={transaction}
            venueTimezone={venueTimezone}
          />

          {receiptUrl !== null && receiptUrl !== undefined ? (
            <div>
              <p className="text-xs font-semibold uppercase text-muted mb-2">
                Comprobante adjunto
              </p>
              {transaction.receiptMimeType?.startsWith('image/') ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={receiptUrl}
                  alt="Comprobante del jugador"
                  className="max-h-48 w-full rounded-lg border border-outline object-contain"
                />
              ) : (
                <a
                  href={receiptUrl}
                  download={`comprobante-${transaction.id}`}
                  className="text-sm font-semibold text-primary-600 hover:underline"
                >
                  Ver comprobante
                </a>
              )}
            </div>
          ) : transaction.receiptId !== null ? (
            <p className="text-sm text-muted">
              Comprobante registrado (ver imagen en el panel lateral).
            </p>
          ) : isCash ? (
            <p className="text-sm text-sky-900 rounded-lg border border-sky-200 bg-sky-50 px-3 py-2">
              Pago en efectivo: no hay comprobante digital. Confirmá solo si
              recibiste el efectivo en caja.
            </p>
          ) : (
            <p className="text-sm text-amber-800 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2">
              Sin comprobante adjunto. Podés confirmar igual si confiás en el
              pago.
            </p>
          )}

          {error ? (
            <p className="text-sm text-red-600">{error}</p>
          ) : null}
        </div>

        <div className="flex gap-2 border-t border-outline bg-gray-50/80 px-5 py-4">
          <button
            type="button"
            onClick={onClose}
            disabled={loading}
            className="btn btn-secondary flex-1"
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={() => void handleConfirm()}
            disabled={loading || !canConfirm}
            className="btn btn-primary flex-[2]"
          >
            {loading ? 'Confirmando…' : 'Confirmar pago'}
          </button>
        </div>
      </div>
    </div>
  );
}
