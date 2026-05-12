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
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);
  const [showConfirm, setShowConfirm] = useState(false);

  const showToast = (message: string, type: 'success' | 'error') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 4000);
  };

  const handleCancel = async () => {
    setShowConfirm(true);
  };

  const handleConfirmCancel = async () => {
    setShowConfirm(false);
    setLoading(true);
    setError(null);

    try {
      await apiClient.venues.reservations.cancel(venueId, reservation.id);
      showToast('Reserva cancelada correctamente', 'success');
      onCancel();
      onClose();
    } catch (err: unknown) {
      const message = err instanceof Error && 'response' in err
        ? (err as { response?: { data?: { message?: string } } }).response?.data?.message ?? 'No se pudo cancelar la reserva.'
        : 'No se pudo cancelar la reserva.';
      setError(message);
      showToast(message, 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleConfirmPayment = async () => {
    setLoading(true);
    setError(null);
    try {
      // Obtener transactions existentes
      const summaryRes = await apiClient.venues.reservations.transactions.getSummary(reservation.id);
      const summary = summaryRes.data.data as { items: Array<{ id: string; status: string }> };

      let transactionId: string | null = null;

      if (summary.items.length > 0) {
        // Ya hay transactions — confirmar la primera impaga
        const unpaid = summary.items.find(t => t.status !== 'CONFIRMED');
        if (unpaid) transactionId = unpaid.id;
      } else {
        // No hay transactions — crear obligations
        await apiClient.venues.reservations.transactions.createObligations(reservation.id);
        // Volver a obtener para saber el transactionId
        const newSummary = await apiClient.venues.reservations.transactions.getSummary(reservation.id);
        const newData = newSummary.data.data as { items: Array<{ id: string; status: string }> };
        if (newData.items.length > 0) transactionId = newData.items[0].id;
      }

      if (!transactionId) {
        throw new Error('No se encontró ninguna transacción para confirmar.');
      }

      await apiClient.transactions.confirm(venueId, transactionId);
      showToast('Pago confirmado correctamente', 'success');
      onCancel();
      onClose();
    } catch (err: unknown) {
      const message = err instanceof Error && 'response' in err
        ? (err as { response?: { data?: { message?: string } } }).response?.data?.message ?? 'No se pudo confirmar el pago.'
        : 'No se pudo confirmar el pago.';
      setError(message);
      showToast(message, 'error');
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
          <h2 className="text-lg font-semibold text-gray-900">Detalle</h2>
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

          {/* Payment Status */}
          <div>
            <label className="text-xs font-medium text-gray-500 uppercase tracking-wider">
              Pago
            </label>
            <p className="mt-1 text-sm">
              <span
                className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${
                  reservation.paymentStatus === 'PAID'
                    ? 'bg-green-100 text-green-700'
                    : reservation.paymentStatus === 'PARTIAL'
                    ? 'bg-yellow-100 text-yellow-700'
                    : 'bg-red-100 text-red-700'
                }`}
              >
                {reservation.paymentStatus === 'PAID' ? 'Pagado' :
                 reservation.paymentStatus === 'PARTIAL' ? 'Pago parcial' : 'Sin pagar'}
              </span>
            </p>
            {reservation.totalAmountCents != null && (
              <div className="mt-1 flex gap-2 text-sm text-gray-600">
                <span>Total: <strong>${(reservation.totalAmountCents / 100).toLocaleString('es-AR')}</strong></span>
                <span>Pagado: <strong>${((reservation.paidAmountCents ?? 0) / 100).toLocaleString('es-AR')}</strong></span>
              </div>
            )}
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
          <div className="flex gap-2">
            {reservation.paymentStatus !== 'PAID' && reservation.status !== 'CANCELLED' && (
              <button
                onClick={handleConfirmPayment}
                disabled={loading}
                className="px-4 py-2 text-sm font-medium text-white bg-green-600 rounded-md hover:bg-green-700 transition-colors disabled:opacity-50"
              >
                {loading ? 'Confirmando...' : 'Confirmar Pago'}
              </button>
            )}
            <button
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200 transition-colors"
            >
              Cerrar
            </button>
          </div>
        </div>

        {/* Confirmación de cancelación */}
        {showConfirm && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[90] p-4">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6 animate-scale-in">
              <div className="w-12 h-12 rounded-full bg-red-100 flex items-center justify-center mx-auto mb-4">
                <svg className="w-6 h-6 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/>
                </svg>
              </div>
              <h2 className="text-xl font-bold text-slate-800 text-center mb-2">Cancelar reserva</h2>
              <p className="text-slate-500 text-sm text-center mb-6">
                ¿Estás seguro de cancelar esta reserva? Esta acción no se puede deshacer.
              </p>
              <div className="flex gap-3">
                <button
                  onClick={() => setShowConfirm(false)}
                  className="flex-1 px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200 transition-colors"
                >
                  Volver
                </button>
                <button
                  onClick={handleConfirmCancel}
                  disabled={loading}
                  className="flex-1 px-4 py-2 text-sm font-medium text-white bg-red-600 rounded-md hover:bg-red-700 transition-colors disabled:opacity-50"
                >
                  {loading ? 'Cancelando...' : 'Sí, cancelar'}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Toast */}
        {toast && (
          <div className={`fixed bottom-6 right-6 z-[100] px-5 py-3 rounded-xl shadow-lg text-white text-sm font-medium flex items-center gap-2 animate-slide-up ${
            toast.type === 'success' ? 'bg-green-600' : 'bg-red-600'
          }`}>
            {toast.type === 'success' ? (
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7"/></svg>
            ) : (
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12"/></svg>
            )}
            {toast.message}
          </div>
        )}
      </div>
    </div>
  );
}