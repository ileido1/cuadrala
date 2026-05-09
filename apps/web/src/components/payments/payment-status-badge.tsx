'use client';

import type { PaymentStatus } from '~/types/api';

interface PaymentStatusBadgeProps {
  status: PaymentStatus;
}

const STATUS_CONFIG: Record<PaymentStatus, { label: string; className: string }> = {
  pending: {
    label: 'Pendiente',
    className: 'bg-amber-100 text-amber-800',
  },
  confirmed: {
    label: 'Confirmado',
    className: 'bg-green-100 text-green-800',
  },
  failed: {
    label: 'Fallido',
    className: 'bg-red-100 text-red-800',
  },
  refunded: {
    label: 'Reembolsado',
    className: 'bg-gray-100 text-gray-800',
  },
};

export function PaymentStatusBadge({ status }: PaymentStatusBadgeProps) {
  const config = STATUS_CONFIG[status] ?? STATUS_CONFIG.pending;

  return (
    <span
      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${config.className}`}
    >
      {config.label}
    </span>
  );
}
