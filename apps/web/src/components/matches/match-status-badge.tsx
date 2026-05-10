'use client';

import type { MatchStatus } from '~/types/api';

interface MatchStatusBadgeProps {
  status: MatchStatus;
}

const STATUS_CONFIG: Record<MatchStatus, { label: string; className: string }> = {
  SCHEDULED: {
    label: 'Programado',
    className: 'bg-blue-100 text-blue-800',
  },
  IN_PROGRESS: {
    label: 'En juego',
    className: 'bg-yellow-100 text-yellow-800',
  },
  FINISHED: {
    label: 'Finalizado',
    className: 'bg-gray-100 text-gray-800',
  },
  CANCELLED: {
    label: 'Cancelado',
    className: 'bg-red-100 text-red-800',
  },
};

export function MatchStatusBadge({ status }: MatchStatusBadgeProps) {
  const config = STATUS_CONFIG[status] ?? STATUS_CONFIG.SCHEDULED;

  return (
    <span
      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${config.className}`}
    >
      {config.label}
    </span>
  );
}