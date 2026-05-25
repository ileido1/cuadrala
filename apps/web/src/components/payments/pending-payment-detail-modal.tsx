'use client';

import { useCallback, useEffect, useState } from 'react';

import { PendingPaymentReviewDialog } from '~/components/payments/pending-payment-review-dialog';
import { PendingPaymentDetails } from '~/components/payments/pending-payment-details';
import { ReceiptImageLightbox } from '~/components/payments/receipt-image-lightbox';
import { apiClient } from '~/lib/api-client';
import {
  formatCentsWithCurrency,
  resolveCurrencyCode,
  type CurrencyCode,
} from '~/lib/format-money';
import type { VenuePendingTransaction } from '~/types/api';

interface PendingPaymentDetailModalProps {
  open: boolean;
  transaction: VenuePendingTransaction | null;
  venueId: string;
  pricingCurrency?: string | null;
  displayCurrency?: string | null;
  venueTimezone?: string;
  onClose: () => void;
  onUpdated: () => void;
}

function obligationMinor(_tx: VenuePendingTransaction): number | null {
  if (_tx.obligationAmountMinor === null) return null;
  const parsed = Number(_tx.obligationAmountMinor);
  return Number.isFinite(parsed) ? parsed : null;
}

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

export function PendingPaymentDetailModal({
  open,
  transaction,
  venueId,
  pricingCurrency,
  displayCurrency,
  venueTimezone = 'America/Caracas',
  onClose,
  onUpdated,
}: PendingPaymentDetailModalProps) {
  const currency = resolveCurrencyCode(
    transaction?.pricingCurrency ?? pricingCurrency,
    displayCurrency,
  ) as CurrencyCode;

  const [receiptUrl, setReceiptUrl] = useState<string | null>(null);
  const [receiptLoading, setReceiptLoading] = useState(false);
  const [receiptError, setReceiptError] = useState<string | null>(null);
  const [receiptExpanded, setReceiptExpanded] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [rejecting, setRejecting] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);

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
      setShowConfirm(false);
      setReceiptExpanded(false);
      setActionError(null);
    }
  }, [open]);

  const handleReject = async () => {
    if (!transaction) return;
    setRejecting(true);
    setActionError(null);
    try {
      await apiClient.transactions.rejectManual(transaction.id, {
        reason: 'Rechazado por el staff desde pagos pendientes',
      });
      onUpdated();
      onClose();
    } catch {
      setActionError('No se pudo rechazar el pago.');
    } finally {
      setRejecting(false);
    }
  };

  if (!open || transaction === null) return null;

  const minor = obligationMinor(transaction);
  const isReceiptImage =
    receiptUrl !== null
    && transaction.receiptMimeType?.startsWith('image/');

  return (
    <>
      <div
        className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
        role="presentation"
        onClick={onClose}
      >
        <div
          className="flex max-h-[90vh] w-full max-w-lg flex-col overflow-hidden rounded-2xl bg-white shadow-xl animate-scale-in"
          role="dialog"
          aria-labelledby="pending-payment-modal-title"
          aria-modal="true"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="flex items-center justify-between border-b border-gray-200 px-6 py-4">
            <h2
              id="pending-payment-modal-title"
              className="text-lg font-semibold text-gray-900"
            >
              Pago pendiente
            </h2>
            <button
              type="button"
              onClick={onClose}
              className="text-gray-400 transition-colors hover:text-gray-600"
              aria-label="Cerrar"
            >
              <CloseIcon />
            </button>
          </div>

          <div className="flex-1 overflow-y-auto px-6 py-4 space-y-4">
            <div>
              <p className="text-xs font-medium uppercase tracking-wider text-gray-500">
                Jugador
              </p>
              <p className="mt-1 text-base font-semibold text-gray-900">
                {transaction.payerName}
              </p>
              {transaction.payerEmail ? (
                <p className="text-sm text-gray-500">{transaction.payerEmail}</p>
              ) : null}
            </div>

            <PendingPaymentDetails
              transaction={transaction}
              venueTimezone={venueTimezone}
            />

            <div>
              <p className="text-xs font-medium uppercase tracking-wider text-gray-500">
                Monto reportado
              </p>
              <p className="mt-1 text-2xl font-bold tabular-nums text-gray-900">
                {minor !== null
                  ? formatCentsWithCurrency(minor, currency)
                  : transaction.amountTotal}
              </p>
            </div>

            <div>
              <p className="text-xs font-medium uppercase tracking-wider text-gray-500 mb-2">
                Comprobante
              </p>
              {transaction.receiptId === null ? (
                <p className="text-sm text-gray-500">Sin comprobante adjunto.</p>
              ) : receiptLoading ? (
                <p className="text-sm text-gray-500">Cargando imagen…</p>
              ) : receiptError ? (
                <p className="text-sm text-red-600">{receiptError}</p>
              ) : isReceiptImage ? (
                <button
                  type="button"
                  onClick={() => setReceiptExpanded(true)}
                  className="group block w-full rounded-lg border border-gray-200 bg-gray-50 p-1 text-left transition hover:border-primary-300 hover:ring-2 hover:ring-primary-200"
                  aria-label="Abrir comprobante en pantalla completa"
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={receiptUrl}
                    alt="Comprobante de pago"
                    className="max-h-64 w-full rounded-md object-contain"
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

            {actionError ? (
              <p className="text-sm text-red-600">{actionError}</p>
            ) : null}
          </div>

          <div className="flex flex-col gap-2 border-t border-gray-200 bg-gray-50/80 px-6 py-4">
            <button
              type="button"
              onClick={() => setShowConfirm(true)}
              className="btn btn-primary w-full"
            >
              Validar y confirmar
            </button>
            <button
              type="button"
              disabled={rejecting}
              onClick={() => void handleReject()}
              className="btn btn-outline w-full border-red-200 text-red-700 hover:bg-red-50 disabled:opacity-50"
            >
              {rejecting ? 'Rechazando…' : 'Rechazar pago'}
            </button>
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

      <PendingPaymentReviewDialog
        open={showConfirm}
        transaction={transaction}
        venueId={venueId}
        pricingCurrency={pricingCurrency}
        displayCurrency={displayCurrency}
        receiptUrl={receiptUrl}
        venueTimezone={venueTimezone}
        onClose={() => setShowConfirm(false)}
        onSuccess={() => {
          setShowConfirm(false);
          onUpdated();
          onClose();
        }}
      />
    </>
  );
}
