'use client';

import type { TournamentStatus } from '~/types/api';

interface TournamentStatusBadgeProps {
  status: TournamentStatus;
}

const STATUS_CONFIG: Record<TournamentStatus, { label: string; className: string }> = {
  DRAFT: {
    label: 'Borrador',
    className: 'bg-gray-100 text-gray-800',
  },
  OPEN: {
    label: 'Abierto',
    className: 'bg-green-100 text-green-800',
  },
  IN_PROGRESS: {
    label: 'En curso',
    className: 'bg-blue-100 text-blue-800',
  },
  COMPLETED: {
    label: 'Completado',
    className: 'bg-purple-100 text-purple-800',
  },
  CANCELLED: {
    label: 'Cancelado',
    className: 'bg-red-100 text-red-800',
  },
};

export function TournamentStatusBadge({ status }: TournamentStatusBadgeProps) {
  const config = STATUS_CONFIG[status] ?? STATUS_CONFIG.DRAFT;

  return (
    <span
      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${config.className}`}
    >
      {config.label}
    </span>
  );
}