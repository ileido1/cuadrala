'use client';

import { useState } from 'react';
import type { ReservationListItem } from '~/types/api';
import { apiClient } from '~/lib/api-client';

interface ReservationDetailModalProps {
  reservation: ReservationListItem;
  venueId: string;
  onClose: () => void;
  onCancel: () => void;
}

export function ReservationDetailModal({ reservation, venueId, onClose, onCancel }: ReservationDetailModalProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleCancel = async () => {
    if (!confirm('¿Estás seguro de cancelar esta reserva?')) return;

    setLoading(true);
    setError(null);

    try {
      await apiClient.venues.reservations.cancel(venueId, reservation.id);
      onCancel();
      onClose();
    } catch {
      setError('No se pudo cancelar la reserva. Intenta de nuevo.');
    } finally {
      setLoading(false);
    }
  };

  const scheduledDate = new Date(reservation.scheduledAt);
  const dateStr = scheduledDate.toLocaleDateString('es-AR', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
  const timeStr = scheduledDate.toLocaleTimeString('es-AR', {
    hour: '2-digit',
    minute: '2-digit',
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full mx-4 max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900">Detalle de Reserva</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
            aria-label="Cerrar"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Content */}
        <div className="px-6 py-4 space-y-4">
          {error && (
            <div className="rounded-md bg-red-50 p-3 text-sm text-red-700">{error}</div>
          )}

          {/* Type badge */}
          <div>
            <span
              className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${
                reservation.type === 'BLOCKED'
                  ? 'bg-red-100 text-red-700'
                  : 'bg-emerald-100 text-emerald-700'
              }`}
            >
              {reservation.type === 'BLOCKED' ? 'Bloqueado' : 'Reserva Directa'}
            </span>
          </div>

          {/* Court */}
          <div>
            <label className="text-xs font-medium text-gray-500 uppercase tracking-wider">
              Cancha
            </label>
            <p className="mt-1 text-sm text-gray-900">
              {reservation.courtName ?? 'Sin asignar'}
            </p>
          </div>

          {/* Date & Time */}
          <div>
            <label className="text-xs font-medium text-gray-500 uppercase tracking-wider">
              Fecha y Hora
            </label>
            <p className="mt-1 text-sm text-gray-900">
              {dateStr} — {timeStr}
            </p>
          </div>

          {/* Duration */}
          <div>
            <label className="text-xs font-medium text-gray-500 uppercase tracking-wider">
              Duración
            </label>
            <p className="mt-1 text-sm text-gray-900">
              {reservation.durationMinutes} minutos
            </p>
          </div>

          {/* Status */}
          <div>
            <label className="text-xs font-medium text-gray-500 uppercase tracking-wider">
              Estado
            </label>
            <p className="mt-1 text-sm">
              <span
                className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${
                  reservation.status === 'CONFIRMED'
                    ? 'bg-emerald-100 text-emerald-700'
                    : 'bg-red-100 text-red-700'
                }`}
              >
                {reservation.status === 'CONFIRMED' ? 'Confirmada' : 'Cancelada'}
              </span>
            </p>
          </div>

          {/* Notes */}
          {reservation.notes && (
            <div>
              <label className="text-xs font-medium text-gray-500 uppercase tracking-wider">
                Notas
              </label>
              <p className="mt-1 text-sm text-gray-700">{reservation.notes}</p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-gray-200 bg-gray-50 flex justify-between">
          <button
            onClick={handleCancel}
            disabled={loading || reservation.status === 'CANCELLED'}
            className="px-4 py-2 text-sm font-medium text-red-700 bg-red-100 rounded-md hover:bg-red-200 transition-colors disabled:opacity-50"
          >
            {loading ? 'Cancelando...' : 'Cancelar Reserva'}
          </button>
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200 transition-colors"
          >
            Cerrar
          </button>
        </div>
      </div>
    </div>
  );
}