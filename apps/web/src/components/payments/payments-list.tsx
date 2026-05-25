'use client';

import { useEffect, useRef, useState } from 'react';

import { PendingPaymentDetailModal } from '~/components/payments/pending-payment-detail-modal';
import { apiClient } from '~/lib/api-client';
import {
  formatCentsWithCurrency,
  resolveCurrencyCode,
  type CurrencyCode,
} from '~/lib/format-money';
import { formatPaymentMethodDisplayName } from '~/lib/payment-method-display';
import type {
  VenuePendingTransaction,
  VenuePendingTransactionsResponse,
} from '~/types/api';

interface PaymentsListProps {
  venueId: string;
  pricingCurrency?: string | null;
  displayCurrency?: string | null;
  countryCode?: string;
  venueTimezone?: string;
  /** Abre el drawer de la transacción indicada (p. ej. desde historial). */
  focusTransactionId?: string | null;
  onFocusConsumed?: () => void;
  /** Drawer controlado desde el padre (opcional). */
  externalSelected?: VenuePendingTransaction | null;
  onExternalSelect?: (tx: VenuePendingTransaction | null) => void;
}

type PaymentsState = 'loading' | 'loaded' | 'empty' | 'error';

export function PaymentsList({
  venueId,
  pricingCurrency,
  displayCurrency,
  countryCode,
  venueTimezone,
  focusTransactionId,
  onFocusConsumed,
  externalSelected,
  onExternalSelect,
}: PaymentsListProps) {
  const currency = resolveCurrencyCode(
    pricingCurrency,
    displayCurrency,
  ) as CurrencyCode;

  const [payments, setPayments] = useState<VenuePendingTransaction[]>([]);
  const [state, setState] = useState<PaymentsState>('loading');
  const [error, setError] = useState<string | null>(null);
  const [internalSelected, setInternalSelected] =
    useState<VenuePendingTransaction | null>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const isControlled = onExternalSelect !== undefined;
  const selected = isControlled ? (externalSelected ?? null) : internalSelected;
  const setSelected = (tx: VenuePendingTransaction | null) => {
    if (isControlled) {
      onExternalSelect?.(tx);
    } else {
      setInternalSelected(tx);
    }
  };

  const fetchPayments = async () => {
    try {
      const response = await apiClient.venues.pendingTransactions(venueId);
      const body = response.data as { data?: VenuePendingTransactionsResponse };
      const items = body.data?.items ?? [];
      if (items.length === 0) {
        setState('empty');
      } else {
        setPayments(items);
        setState('loaded');
      }
      setError(null);
    } catch {
      setState('error');
      setError('Error al cargar los pagos pendientes');
    }
  };

  useEffect(() => {
    void fetchPayments();

    intervalRef.current = setInterval(() => {
      void fetchPayments();
    }, 30000);

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [venueId]);

  useEffect(() => {
    if (!focusTransactionId || payments.length === 0) return;
    const match = payments.find((p) => p.id === focusTransactionId);
    if (match) {
      setSelected(match);
      onFocusConsumed?.();
    }
  }, [focusTransactionId, payments, onFocusConsumed]);

  const formatDate = (dateString: string) =>
    new Intl.DateTimeFormat('es-AR', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    }).format(new Date(dateString));

  const formatAmount = (tx: VenuePendingTransaction) => {
    if (tx.obligationAmountMinor !== null) {
      const minor = Number(tx.obligationAmountMinor);
      if (Number.isFinite(minor)) {
        return formatCentsWithCurrency(
          minor,
          resolveCurrencyCode(tx.pricingCurrency, currency) as CurrencyCode,
        );
      }
    }
    return tx.amountTotal;
  };

  if (state === 'loading') {
    return (
      <div className="space-y-4">
        <div className="animate-pulse space-y-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-16 bg-gray-100 rounded-lg" />
          ))}
        </div>
      </div>
    );
  }

  if (state === 'error') {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center">
        <p className="text-red-600 mb-4">{error}</p>
        <button
          type="button"
          onClick={() => void fetchPayments()}
          className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700"
        >
          Reintentar
        </button>
      </div>
    );
  }

  if (state === 'empty') {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center">
        <p className="text-gray-500 text-lg">No hay pagos pendientes</p>
        <p className="text-gray-400 text-sm mt-2">
          Cuando un jugador suba un comprobante aparecerá aquí
        </p>
      </div>
    );
  }

  return (
    <>
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                Cancha
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                Forma de pago
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                Monto
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                Jugador
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                Fecha
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                Comprobante
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {payments.map((payment) => (
              <tr
                key={payment.id}
                className="hover:bg-gray-50 cursor-pointer"
                onClick={() => setSelected(payment)}
              >
                <td className="px-4 py-3 text-sm text-gray-900">
                  {payment.courtName}
                </td>
                <td className="px-4 py-3 text-sm text-gray-500">
                  {formatPaymentMethodDisplayName(payment)}
                </td>
                <td className="px-4 py-3 text-sm font-medium text-gray-900">
                  {formatAmount(payment)}
                </td>
                <td className="px-4 py-3 text-sm text-gray-500">
                  {payment.payerName}
                </td>
                <td className="px-4 py-3 text-sm text-gray-500">
                  {formatDate(payment.createdAt)}
                </td>
                <td className="px-4 py-3 text-sm">
                  {payment.receiptId !== null ? (
                    <span className="text-emerald-700 font-semibold">Sí</span>
                  ) : (
                    <span className="text-gray-400">No</span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {!isControlled ? (
        <PendingPaymentDetailModal
          open={selected !== null}
          transaction={selected}
          venueId={venueId}
          pricingCurrency={pricingCurrency}
          displayCurrency={displayCurrency}
          venueTimezone={venueTimezone}
          onClose={() => setSelected(null)}
          onUpdated={() => {
            setSelected(null);
            void fetchPayments();
          }}
        />
      ) : null}
    </>
  );
}
