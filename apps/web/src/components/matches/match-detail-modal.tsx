'use client';

import type { MatchDetailDto } from '~/types/api';
import { MatchStatusBadge } from './match-status-badge';

interface MatchDetailModalProps {
  match: MatchDetailDto;
  onClose: () => void;
  loading?: boolean;
}

export function MatchDetailModal({ match, onClose, loading }: MatchDetailModalProps) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="bg-white rounded-lg shadow-xl max-w-lg w-full mx-4 max-h-[90vh] overflow-y-auto">
        {loading ? (
          <div className="p-6 flex items-center justify-center">
            <div className="animate-spin h-8 w-8 border-4 border-primary-600 border-t-transparent rounded-full" />
          </div>
        ) : (
          <>
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
              <h2 className="text-lg font-semibold text-gray-900">Detalle del Partido</h2>
              <button
                onClick={onClose}
                className="text-gray-400 hover:text-gray-600 transition-colors"
                aria-label="Cerrar"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M6 18L18 6M6 6l12 12"
                  />
                </svg>
              </button>
            </div>

            {/* Content */}
            <div className="px-6 py-4 space-y-4">
              {/* Status + Type */}
              <div className="flex items-center gap-3">
                <MatchStatusBadge status={match.status} />
                <span className="text-sm text-gray-500">
                  {match.type === 'AMERICANO' ? 'Americano' : 'Regular'}
                </span>
              </div>

              {/* Scheduled Time */}
              <div>
                <label className="text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Fecha y Hora
                </label>
                <p className="mt-1 text-sm text-gray-900">
                  {match.scheduledAt
                    ? new Date(match.scheduledAt).toLocaleString('es-AR', {
                        weekday: 'long',
                        day: 'numeric',
                        month: 'long',
                        hour: '2-digit',
                        minute: '2-digit',
                      })
                    : 'Sin asignar'}
                </p>
              </div>

              {/* Court */}
              <div>
                <label className="text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Cancha
                </label>
                <p className="mt-1 text-sm text-gray-900">
                  {match.courtName ?? 'Sin asignar'}
                </p>
              </div>

              {/* Category */}
              {match.categoryName && (
                <div>
                  <label className="text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Categoría
                  </label>
                  <p className="mt-1 text-sm text-gray-900">{match.categoryName}</p>
                </div>
              )}

              {/* Price per player */}
              <div>
                <label className="text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Precio por Jugador
                </label>
                <p className="mt-1 text-sm text-gray-900">
                  ${(match.pricePerPlayerCents / 100).toFixed(2)}
                </p>
              </div>

              {/* Participants */}
              <div>
                <label className="text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Jugadores ({match.participantCount}/{match.maxParticipants})
                </label>
                <div className="mt-2 space-y-2">
                  {match.participants.length === 0 ? (
                    <p className="text-sm text-gray-400">No hay jugadores registrados</p>
                  ) : (
                    match.participants.map((participant) => (
                      <div
                        key={participant.userId}
                        className="flex items-center justify-between py-2 px-3 bg-gray-50 rounded-md"
                      >
                        <span className="text-sm font-medium text-gray-900">
                          {participant.displayName ?? participant.userId}
                        </span>
                        <span className="text-xs text-gray-400">
                          {new Date(participant.joinedAt).toLocaleDateString('es-AR')}
                        </span>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="px-6 py-4 border-t border-gray-200 bg-gray-50">
              <button
                onClick={onClose}
                className="w-full px-4 py-2 bg-primary-600 text-white rounded-md hover:bg-primary-700 transition-colors"
              >
                Cerrar
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}