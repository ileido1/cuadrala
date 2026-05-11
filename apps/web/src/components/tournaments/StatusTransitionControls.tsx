'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { apiClient } from '~/lib/api-client';
import type { TournamentStatus } from '~/types/api';

interface StatusTransitionControlsProps {
  tournamentId: string;
  currentStatus: TournamentStatus;
}

interface TransitionConfig {
  label: string;
  targetStatus: TournamentStatus;
  variant: 'primary' | 'secondary' | 'danger';
}

const TRANSITION_MAP: Record<TournamentStatus, TransitionConfig[]> = {
  DRAFT: [{ label: 'Abrir inscripciones', targetStatus: 'OPEN', variant: 'primary' }],
  OPEN: [
    { label: 'Iniciar torneo', targetStatus: 'IN_PROGRESS', variant: 'primary' },
    { label: 'Cancelar', targetStatus: 'CANCELLED', variant: 'danger' },
  ],
  IN_PROGRESS: [
    { label: 'Finalizar torneo', targetStatus: 'COMPLETED', variant: 'primary' },
    { label: 'Cancelar', targetStatus: 'CANCELLED', variant: 'danger' },
  ],
  COMPLETED: [],
  CANCELLED: [],
};

// Pure function for determining available transitions
export function getAvailableTransitions(status: TournamentStatus): TournamentStatus[] {
  switch (status) {
    case 'DRAFT':
      return ['OPEN'];
    case 'OPEN':
      return ['IN_PROGRESS', 'CANCELLED'];
    case 'IN_PROGRESS':
      return ['COMPLETED', 'CANCELLED'];
    case 'COMPLETED':
    case 'CANCELLED':
      return [];
  }
}

export function StatusTransitionControls({ tournamentId, currentStatus }: StatusTransitionControlsProps) {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const transitions = TRANSITION_MAP[currentStatus] ?? [];

  const handleTransition = async (targetStatus: TournamentStatus) => {
    setIsLoading(true);
    setError(null);

    try {
      await apiClient.tournaments.updateStatus(tournamentId, targetStatus);
      router.refresh();
    } catch {
      setError('Error al cambiar el estado del torneo');
      setIsLoading(false);
    }
  };

  if (transitions.length === 0) {
    return null;
  }

  return (
    <div className="flex items-center gap-2">
      {error && (
        <span className="text-sm text-red-600">{error}</span>
      )}
      {transitions.map((transition) => (
        <button
          key={transition.targetStatus}
          onClick={() => handleTransition(transition.targetStatus)}
          disabled={isLoading}
          className={`
            px-3 py-1.5 rounded-lg text-sm font-medium transition-colors
            ${transition.variant === 'primary'
              ? 'bg-primary-500 text-white hover:bg-primary-600 disabled:bg-gray-300'
              : transition.variant === 'danger'
              ? 'bg-red-500 text-white hover:bg-red-600 disabled:bg-gray-300'
              : 'bg-gray-100 text-gray-700 hover:bg-gray-200 disabled:bg-gray-100'
            }
          `}
        >
          {transition.label}
        </button>
      ))}
    </div>
  );
}