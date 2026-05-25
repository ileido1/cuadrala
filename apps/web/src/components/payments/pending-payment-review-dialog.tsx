'use client';

import { useEffect, useState } from 'react';

import { apiClient } from '~/lib/api-client';
import {
  formatCentsWithCurrency,
  resolveCurrencyCode,
  type CurrencyCode,
} from '~/lib/format-money';
import { PendingPaymentDetails } from '~/components/payments/pending-payment-details';
import type { VenuePendingTransaction, VenuePaymentMethod } from '~/types/api';

interface PendingPaymentReviewDialogProps {
  open: boolean;
  transaction: VenuePendingTransaction;
  venueId: string;
  pricingCurrency?: string | null;
  displayCurrency?: string | null;
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

function resolveSettlement(
  _tx: VenuePendingTransaction,
  _fallbackCurrency: CurrencyCode,
): { amountMinor: string; currencyCode: CurrencyCode } | null {
  if (_tx.obligationAmountMinor !== null) {
    const minor = Number(_tx.obligationAmountMinor);
    if (Number.isFinite(minor) && minor > 0) {
      const code = resolveCurrencyCode(
        _tx.obligationCurrency ?? _tx.pricingCurrency,
        _fallbackCurrency,
      ) as CurrencyCode;
      return { amountMinor: String(minor), currencyCode: code };
    }
  }
  const major = Number(_tx.amountTotal);
  if (Number.isFinite(major) && major > 0) {
    const code = resolveCurrencyCode(_tx.pricingCurrency, _fallbackCurrency) as CurrencyCode;
    return {
      amountMinor: String(Math.round(major * 100)),
      currencyCode: code,
    };
  }
  return null;
}

export function PendingPaymentReviewDialog({
  open,
  transaction,
  venueId,
  pricingCurrency,
  displayCurrency,
  receiptUrl,
  venueTimezone = 'America/Caracas',
  onClose,
  onSuccess,
}: PendingPaymentReviewDialogProps) {
  const currency = resolveCurrencyCode(
    transaction.pricingCurrency ?? pricingCurrency,
    displayCurrency,
  ) as CurrencyCode;

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [paymentMethods, setPaymentMethods] = useState<VenuePaymentMethod[]>([]);

  const settlement = resolveSettlement(transaction, currency);
  const needsReservationSettlement =
    transaction.reservationId !== null
    && transaction.reservationId !== '';

  useEffect(() => {
    if (!open) return;
    setError(null);
    apiClient.venues.paymentMethods
      .listAll(venueId)
      .then((r) => {
        const items = parsePaymentMethodsResponse(r.data?.data);
        setPaymentMethods(items.filter((pm) => pm.isActive !== false && Boolean(pm.id)));
      })
      .catch(() => setPaymentMethods([]));
  }, [open, venueId]);

  if (!open) return null;

  const handleConfirm = async () => {
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

      if (needsReservationSettlement) {
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
            El jugador ya registró el pago y subió el comprobante. Revisá los
            datos y confirmá o rechazá.
          </p>
        </div>

        <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4">
          <div className="rounded-xl border border-emerald-100 bg-emerald-50/80 px-4 py-3">
            <p className="text-xs font-semibold uppercase tracking-wide text-emerald-800">
              Monto reportado por el jugador
            </p>
            <p className="mt-1 text-2xl font-bold tabular-nums text-emerald-950">
              {amountLabel}
            </p>
          </div>

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
            disabled={loading}
            className="btn btn-primary flex-[2]"
          >
            {loading ? 'Confirmando…' : 'Confirmar pago'}
          </button>
        </div>
      </div>
    </div>
  );
}
