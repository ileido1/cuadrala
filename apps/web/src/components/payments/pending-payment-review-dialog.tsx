'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';

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
import { ReceiptImageLightbox } from '~/components/payments/receipt-image-lightbox';
import { SettlementConversionCard } from '~/components/payments/settlement-conversion-card';
import type { VenuePendingTransaction, VenuePaymentMethod } from '~/types/api';

interface PendingPaymentReviewDialogProps {
  open: boolean;
  transaction: VenuePendingTransaction | null;
  venueId: string;
  pricingCurrency?: string | null;
  displayCurrency?: string | null;
  countryCode?: string;
  venueTimezone?: string;
  onClose: () => void;
  onUpdated: () => void;
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

/** Total de obligación en minor (amountTotal del API está en unidades mayores). */
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

function reportedMinorFromTx(_tx: VenuePendingTransaction): number | null {
  if (_tx.playerReportedSettlementMinor === null) return null;
  const minor = Number(_tx.playerReportedSettlementMinor);
  return Number.isFinite(minor) && minor > 0 ? minor : null;
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

function CloseIcon() {
  return (
    <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M6 18L18 6M6 6l12 12"
      />
    </svg>
  );
}

export function PendingPaymentReviewDialog({
  open,
  transaction,
  venueId,
  pricingCurrency,
  displayCurrency,
  countryCode = 'VE',
  venueTimezone = 'America/Caracas',
  onClose,
  onUpdated,
}: PendingPaymentReviewDialogProps) {
  const [confirming, setConfirming] = useState(false);
  const [rejecting, setRejecting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [paymentMethods, setPaymentMethods] = useState<VenuePaymentMethod[]>([]);
  const [exchangeRates, setExchangeRates] = useState<ExchangeRateRow[]>([]);
  const [ratesLoading, setRatesLoading] = useState(false);
  const [ratesError, setRatesError] = useState<string | null>(null);
  const [receiptUrl, setReceiptUrl] = useState<string | null>(null);
  const [receiptLoading, setReceiptLoading] = useState(false);
  const [receiptError, setReceiptError] = useState<string | null>(null);
  const [receiptExpanded, setReceiptExpanded] = useState(false);

  const isBusy = confirming || rejecting;

  const loadReceipt = useCallback(async () => {
    if (!transaction?.receiptId) return;
    setReceiptLoading(true);
    setReceiptError(null);
    try {
      const res = await apiClient.transactions.getReceipt(
        transaction.id,
        transaction.receiptId,
      );
      const blob = res.data as Blob;
      const url = URL.createObjectURL(blob);
      setReceiptUrl((prev) => {
        if (prev !== null) URL.revokeObjectURL(prev);
        return url;
      });
    } catch {
      setReceiptError('No se pudo cargar el comprobante.');
    } finally {
      setReceiptLoading(false);
    }
  }, [transaction?.id, transaction?.receiptId]);

  useEffect(() => {
    if (!open || !transaction?.receiptId) {
      setReceiptUrl((prev) => {
        if (prev !== null) URL.revokeObjectURL(prev);
        return null;
      });
      setReceiptExpanded(false);
      return;
    }
    void loadReceipt();
    return () => {
      setReceiptUrl((prev) => {
        if (prev !== null) URL.revokeObjectURL(prev);
        return null;
      });
    };
  }, [open, transaction?.id, transaction?.receiptId, loadReceipt]);

  useEffect(() => {
    if (!open) {
      setError(null);
      setReceiptExpanded(false);
    }
  }, [open]);

  useEffect(() => {
    if (!open || !transaction) return;
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
  }, [open, transaction, venueId, countryCode]);

  const obligationCurrency = resolveCurrencyCode(
    transaction?.pricingCurrency ?? pricingCurrency,
    displayCurrency,
  ) as CurrencyCode;

  const matchedMethod = useMemo(() => {
    if (!transaction) return undefined;
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

  const obligationMinor = transaction ? obligationMinorFromTx(transaction) : null;
  const reportedMinor = transaction ? reportedMinorFromTx(transaction) : null;
  const reportedCurrency = resolveCurrencyCode(
    transaction?.playerReportedSettlementCurrency,
    settlementCurrency,
  ) as CurrencyCode;

  const bookingDateIso = useMemo(
    () =>
      transaction
        ? localCalendarDateIsoSV(transaction.scheduledAt, venueTimezone)
        : '',
    [transaction, venueTimezone],
  );

  const fxSnapshot: FxSnapshot = useMemo(() => {
    if (
      !transaction
      || obligationMinor === null
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
    transaction,
    obligationMinor,
    obligationCurrency,
    settlementCurrency,
    exchangeRates,
    bookingDateIso,
  ]);

  const settlement =
    transaction === null
      ? null
      : resolveSettlement(
          transaction,
          obligationCurrency,
          settlementCurrency,
          fxSnapshot.kind === 'ready' ? fxSnapshot.settlementMinor : null,
        );

  const canConfirm =
    fxSnapshot.kind !== 'missing_rate' && settlement !== null;

  const hasBookingContext =
    transaction !== null
    && ((transaction.reservationId !== null && transaction.reservationId !== '')
      || (transaction.matchId !== null && transaction.matchId !== ''));

  const isCash = transaction?.paymentMethodType === 'CASH';

  if (!open || transaction === null) return null;

  const handleConfirm = async () => {
    if (!canConfirm) return;
    setConfirming(true);
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
      onUpdated();
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
      setConfirming(false);
    }
  };

  const handleReject = async () => {
    setRejecting(true);
    setError(null);
    try {
      await apiClient.transactions.rejectManual(transaction.id, {
        reason: 'Rechazado por el staff desde pagos pendientes',
      });
      onUpdated();
      onClose();
    } catch {
      setError('No se pudo rechazar el pago.');
    } finally {
      setRejecting(false);
    }
  };

  const settlementLabel =
    settlement !== null
      ? formatCentsWithCurrency(
          Number(settlement.amountMinor),
          settlement.currencyCode,
        )
      : transaction.amountTotal;

  const reportedLabel =
    reportedMinor !== null
      ? formatCentsWithCurrency(reportedMinor, reportedCurrency)
      : null;

  const reportedDiffersFromSettlement =
    reportedMinor !== null
    && settlement !== null
    && (
      reportedMinor !== Number(settlement.amountMinor)
      || reportedCurrency !== settlement.currencyCode
    );

  const contextFxLabel =
    transaction.matchId !== null && transaction.matchId !== ''
      ? 'Cuota en partida'
      : 'Cobro en reserva';

  const isReceiptImage =
    receiptUrl !== null
    && transaction.receiptMimeType?.startsWith('image/');

  return (
    <>
      <div
        className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 p-0 sm:items-center sm:p-4"
        role="presentation"
        onClick={onClose}
      >
        <div
          className="flex max-h-[92vh] w-full max-w-lg flex-col overflow-hidden rounded-t-2xl bg-white shadow-2xl sm:rounded-2xl"
          role="dialog"
          aria-labelledby="review-payment-title"
          aria-modal="true"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="flex items-start justify-between gap-3 border-b border-outline px-5 py-4">
            <div>
              <h2
                id="review-payment-title"
                className="text-lg font-bold text-[#0F172A]"
              >
                Validar pago del jugador
              </h2>
              <p className="mt-1 text-sm text-muted">
                {isCash
                  ? 'El jugador registró un pago en efectivo. Verificá el monto y confirmá o rechazá.'
                  : 'Revisá el comprobante, la conversión si aplica, y confirmá o rechazá.'}
              </p>
            </div>
            <button
              type="button"
              onClick={onClose}
              disabled={isBusy}
              className="shrink-0 text-gray-400 transition-colors hover:text-gray-600 disabled:opacity-50"
              aria-label="Cerrar"
            >
              <CloseIcon />
            </button>
          </div>

          <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-muted">
                Jugador
              </p>
              <p className="mt-1 text-base font-semibold text-[#0F172A]">
                {transaction.payerName}
              </p>
              {transaction.payerEmail ? (
                <p className="text-sm text-muted">{transaction.payerEmail}</p>
              ) : null}
            </div>

            {reportedLabel !== null ? (
              <div className="rounded-xl border border-amber-200 bg-amber-50/90 px-4 py-3">
                <p className="text-xs font-semibold uppercase tracking-wide text-amber-900">
                  Monto reportado por el jugador ({reportedCurrency})
                </p>
                <p className="mt-1 text-2xl font-bold tabular-nums text-amber-950">
                  {reportedLabel}
                </p>
                {reportedDiffersFromSettlement && fxSnapshot.kind === 'ready' ? (
                  <p className="mt-2 text-xs text-amber-800/90">
                    El jugador vio este monto en la app al transferir. Comparalo
                    con el monto a liquidar según la cuota total (incluye
                    comisión) y la tasa del día.
                  </p>
                ) : null}
              </div>
            ) : null}

            <div className="rounded-xl border border-emerald-100 bg-emerald-50/80 px-4 py-3">
              <p className="text-xs font-semibold uppercase tracking-wide text-emerald-800">
                {fxSnapshot.kind === 'ready'
                  ? `Monto a liquidar (${settlementCurrency})`
                  : 'Monto de la obligación'}
              </p>
              <p className="mt-1 text-2xl font-bold tabular-nums text-emerald-950">
                {settlementLabel}
              </p>
              {fxSnapshot.kind === 'ready' ? (
                <p className="mt-1 text-xs text-emerald-800/80">
                  Calculado desde la cuota total (base + comisión) y la tasa del
                  día del partido.
                </p>
              ) : null}
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

            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-muted mb-2">
                Comprobante
              </p>
              {transaction.receiptId === null ? (
                isCash ? (
                  <p className="text-sm text-sky-900 rounded-lg border border-sky-200 bg-sky-50 px-3 py-2">
                    Pago en efectivo: no hay comprobante digital. Confirmá solo
                    si recibiste el efectivo en caja.
                  </p>
                ) : (
                  <p className="text-sm text-amber-800 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2">
                    Sin comprobante adjunto. Podés confirmar igual si confiás en
                    el pago.
                  </p>
                )
              ) : receiptLoading ? (
                <p className="text-sm text-muted">Cargando imagen…</p>
              ) : receiptError ? (
                <p className="text-sm text-red-600">{receiptError}</p>
              ) : isReceiptImage ? (
                <button
                  type="button"
                  onClick={() => setReceiptExpanded(true)}
                  className="group block w-full rounded-lg border border-outline bg-gray-50 p-1 text-left transition hover:border-primary-300 hover:ring-2 hover:ring-primary-200"
                  aria-label="Abrir comprobante en pantalla completa"
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={receiptUrl}
                    alt="Comprobante del jugador"
                    className="max-h-48 w-full rounded-md object-contain"
                  />
                  <span className="mt-1 block px-2 pb-1 text-xs font-semibold text-primary-600 group-hover:underline">
                    Tocar para ampliar
                  </span>
                </button>
              ) : receiptUrl !== null ? (
                <a
                  href={receiptUrl}
                  download={`comprobante-${transaction.id}`}
                  className="text-sm font-semibold text-primary-600 hover:underline"
                >
                  Descargar comprobante
                </a>
              ) : null}
            </div>

            {error ? (
              <p className="text-sm text-red-600">{error}</p>
            ) : null}
          </div>

          <div className="flex flex-col gap-2 border-t border-outline bg-gray-50/80 px-5 py-4">
            <button
              type="button"
              disabled={isBusy}
              onClick={() => void handleReject()}
              className="btn btn-outline w-full border-red-200 text-red-700 hover:bg-red-50 disabled:opacity-50"
            >
              {rejecting ? 'Rechazando…' : 'Rechazar pago'}
            </button>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={onClose}
                disabled={isBusy}
                className="btn btn-secondary flex-1"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={() => void handleConfirm()}
                disabled={isBusy || !canConfirm}
                className="btn btn-primary flex-[2]"
              >
                {confirming ? 'Confirmando…' : 'Confirmar pago'}
              </button>
            </div>
          </div>
        </div>
      </div>

      {isReceiptImage && receiptUrl !== null ? (
        <ReceiptImageLightbox
          open={receiptExpanded}
          imageUrl={receiptUrl}
          alt="Comprobante de pago"
          onClose={() => setReceiptExpanded(false)}
        />
      ) : null}
    </>
  );
}
