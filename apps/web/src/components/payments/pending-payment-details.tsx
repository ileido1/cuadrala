'use client';

import {
  formatPaymentMethodDisplayName,
  formatScheduledAtLabel,
  paymentMethodDetailRows,
} from '~/lib/payment-method-display';
import type { VenuePendingTransaction } from '~/types/api';

interface PendingPaymentDetailsProps {
  transaction: VenuePendingTransaction;
  venueTimezone?: string;
}

export function PendingPaymentDetails({
  transaction,
  venueTimezone = 'America/Caracas',
}: PendingPaymentDetailsProps) {
  const methodLabel = formatPaymentMethodDisplayName(transaction);
  const detailRows = paymentMethodDetailRows(
    transaction.paymentMethodType,
    transaction.paymentMethodConfig,
  );
  const scheduleLabel = formatScheduledAtLabel(
    transaction.scheduledAt,
    venueTimezone,
  );

  return (
    <div className="space-y-4">
      <div>
        <p className="text-xs font-semibold uppercase tracking-wide text-muted">
          Cancha
        </p>
        <p className="text-base font-semibold text-[#0F172A]">
          {transaction.courtName}
        </p>
        <p className="text-sm text-muted">{scheduleLabel}</p>
      </div>

      <div>
        <p className="text-xs font-semibold uppercase tracking-wide text-muted">
          Forma de pago (jugador)
        </p>
        <p className="text-sm font-medium text-[#0F172A]">{methodLabel}</p>
        {detailRows.length > 0 ? (
          <dl className="mt-2 space-y-1 rounded-lg border border-outline/80 bg-surface-container/30 px-3 py-2 text-xs">
            {detailRows.map((row) => (
              <div key={row.label} className="flex justify-between gap-3">
                <dt className="text-muted">{row.label}</dt>
                <dd className="font-medium text-[#0F172A] text-right">
                  {row.value}
                </dd>
              </div>
            ))}
          </dl>
        ) : null}
      </div>
    </div>
  );
}
