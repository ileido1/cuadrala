'use client';

import { useEffect, useState } from 'react';
import type { PaymentMethodType, BookingItem, VenuePaymentMethod } from '~/types/api';
import { apiClient } from '~/lib/api-client';

interface ReservationDetailModalProps {
  reservation: BookingItem;
  venueId: string;
  onClose: () => void;
  onCancel: () => void;
}

type PaymentStep = 'summary' | 'method' | 'confirm';

interface PaymentSummary {
  totalAmount: number;
  paidAmount: number;
  pendingAmount: number;
}

export function ReservationDetailModal({ reservation, venueId, onClose, onCancel }: ReservationDetailModalProps) {
  const [loading, setLoading] = useState(false);
  const [stepLoading, setStepLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);
  const [showConfirm, setShowConfirm] = useState(false);
  const [showPaymentConfirm, setShowPaymentConfirm] = useState(false);
  const [paymentMethods, setPaymentMethods] = useState<VenuePaymentMethod[]>([]);
  const [selectedPaymentMethodType, setSelectedPaymentMethodType] = useState<string>('');
  const [selectedPaymentMethodId, setSelectedPaymentMethodId] = useState<string>('');
  const [paymentReference, setPaymentReference] = useState('');
  const [paymentStep, setPaymentStep] = useState<PaymentStep>('summary');
  const [paymentSummary, setPaymentSummary] = useState<PaymentSummary | null>(null);
  const [confirmedPayment, setConfirmedPayment] = useState(false);

  // Fetch payment methods when modal opens
  useEffect(() => {
    apiClient.venues.paymentMethods.list(venueId)
      .then(r => setPaymentMethods(r.data.data.items))
      .catch(() => {});
  }, [venueId]);

  // Fetch payment summary when opening payment flow
  useEffect(() => {
    if (showPaymentConfirm && reservation.id) {
      fetchPaymentSummary();
    }
  }, [showPaymentConfirm, reservation.id]);

  const fetchPaymentSummary = async () => {
    setStepLoading(true);
    try {
      const res = await apiClient.venues.reservations.transactions.getSummary(reservation.id);
      const data = res.data.data as { items: Array<{ id: string; status: string; amountTotal?: string }> };

      let totalPending = 0;
      for (const item of data.items) {
        if (item.status !== 'CONFIRMED' && item.amountTotal) {
          totalPending += Number(item.amountTotal);
        }
      }

      const pending = reservation.totalAmountCents != null
        ? reservation.totalAmountCents - (reservation.paidAmountCents ?? 0)
        : totalPending * 100;

      setPaymentSummary({
        totalAmount: reservation.totalAmountCents ?? totalPending * 100,
        paidAmount: reservation.paidAmountCents ?? 0,
        pendingAmount: pending,
      });
    } catch {
      setPaymentSummary({
        totalAmount: reservation.totalAmountCents ?? 0,
        paidAmount: reservation.paidAmountCents ?? 0,
        pendingAmount: 0,
      });
    } finally {
      setStepLoading(false);
    }
  };

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

  const handleConfirmPayment = () => {
    setShowPaymentConfirm(true);
    setPaymentStep('summary');
    setSelectedPaymentMethodType('');
    setSelectedPaymentMethodId('');
    setPaymentReference('');
    setConfirmedPayment(false);
  };

  const handlePaymentNext = () => {
    if (paymentStep === 'summary') {
      setPaymentStep('method');
    }
  };

  const handleMethodSelect = () => {
    if (selectedPaymentMethodId) {
      setPaymentStep('confirm');
    }
  };

  const handleConfirmPaymentSubmit = async () => {
    if (!selectedPaymentMethodId) {
      setError('Selecciona un medio de pago.');
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const selectedMethod = paymentMethods.find(m => m.id === selectedPaymentMethodId);
      const summaryRes = await apiClient.venues.reservations.transactions.getSummary(reservation.id);
      const summary = summaryRes.data.data as { items: Array<{ id: string; status: string }> };

      let transactionId: string | null = null;

      if (summary.items.length > 0) {
        const unpaid = summary.items.find(t => t.status !== 'CONFIRMED');
        if (unpaid) transactionId = unpaid.id;
      } else {
        await apiClient.venues.reservations.transactions.createObligations(reservation.id);
        const newSummary = await apiClient.venues.reservations.transactions.getSummary(reservation.id);
        const newData = newSummary.data.data as { items: Array<{ id: string; status: string }> };
        if (newData.items.length > 0) transactionId = newData.items[0].id;
      }

      if (!transactionId) {
        throw new Error('No se encontró ninguna transacción para confirmar.');
      }

      await apiClient.instance.patch(
        `/transactions/${transactionId}/confirm-manual`,
        {
          venuePaymentMethodId: selectedPaymentMethodId,
          referenceNumber: paymentReference || undefined,
          paymentData: selectedMethod?.config ?? undefined,
        },
      );

      setConfirmedPayment(true);
      showToast('Pago confirmado correctamente', 'success');
      setTimeout(() => {
        onCancel();
        onClose();
      }, 1500);
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

  const handleBack = () => {
    if (paymentStep === 'method') {
      setPaymentStep('summary');
    } else if (paymentStep === 'confirm') {
      setPaymentStep('method');
      setError(null);
    }
  };

  const handleClosePaymentModal = () => {
    setShowPaymentConfirm(false);
    setPaymentStep('summary');
    setError(null);
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

  const selectedMethod = paymentMethods.find(m => m.id === selectedPaymentMethodId);
  const config = selectedMethod?.config as Record<string, string> | undefined;

  const TYPE_LABELS: Record<string, string> = {
    CASH: 'Efectivo',
    BANK_TRANSFER: 'Transferencia',
    PAGO_MOVIL: 'Pago Móvil',
    POS: 'POS (Tarjeta)',
    OTHER: 'Otro',
  };

  const availableTypes = [...new Set(paymentMethods.map(pm => pm.type))];

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

        {/* Flujo de Confirmación de Pago */}
        {showPaymentConfirm && !confirmedPayment && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[90] p-4">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6 animate-scale-in">
              {/* Header con paso */}
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-bold text-slate-800">Confirmar Pago</h2>
                <button
                  onClick={handleClosePaymentModal}
                  className="text-gray-400 hover:text-gray-600 transition-colors"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              {/* Step indicator */}
              <div className="flex items-center justify-center gap-2 mb-6">
                <div className={`flex items-center justify-center w-7 h-7 rounded-full text-xs font-bold ${paymentStep === 'summary' ? 'bg-green-600 text-white' : 'bg-green-100 text-green-600'}`}>
                  {paymentStep === 'method' || paymentStep === 'confirm' ? '✓' : '1'}
                </div>
                <div className={`w-8 h-0.5 ${paymentStep !== 'summary' ? 'bg-green-600' : 'bg-gray-200'}`} />
                <div className={`flex items-center justify-center w-7 h-7 rounded-full text-xs font-bold ${paymentStep === 'method' ? 'bg-green-600 text-white' : paymentStep === 'confirm' ? 'bg-green-100 text-green-600' : 'bg-gray-100 text-gray-400'}`}>
                  {paymentStep === 'confirm' ? '✓' : '2'}
                </div>
                <div className={`w-8 h-0.5 ${paymentStep === 'confirm' ? 'bg-green-600' : 'bg-gray-200'}`} />
                <div className={`flex items-center justify-center w-7 h-7 rounded-full text-xs font-bold ${paymentStep === 'confirm' ? 'bg-green-600 text-white' : 'bg-gray-100 text-gray-400'}`}>
                  3
                </div>
              </div>

              {error && <div className="mb-3 p-2 rounded bg-red-50 text-red-700 text-sm">{error}</div>}

              {/* Step 1: Resumen */}
              {paymentStep === 'summary' && (
                <div className="space-y-4 mb-6">
                  {stepLoading ? (
                    <div className="flex justify-center py-8">
                      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-600" />
                    </div>
                  ) : (
                    <>
                      <div className="bg-gradient-to-br from-green-50 to-emerald-50 rounded-xl p-4 border border-green-100">
                        <p className="text-sm text-green-600 font-medium mb-2">Monto a pagar</p>
                        <p className="text-3xl font-bold text-green-700">
                          {paymentSummary
                            ? `$${(paymentSummary.pendingAmount / 100).toLocaleString('es-AR', { minimumFractionDigits: 2 })}`
                            : '--'}
                        </p>
                        {paymentSummary && paymentSummary.paidAmount > 0 && (
                          <p className="text-xs text-green-600 mt-1">
                            Ya pagaste: ${(paymentSummary.paidAmount / 100).toLocaleString('es-AR')}
                          </p>
                        )}
                      </div>

                      <div className="space-y-2 text-sm">
                        <div className="flex justify-between">
                          <span className="text-gray-500">Total reserva</span>
                          <span className="font-medium">
                            ${paymentSummary
                              ? (paymentSummary.totalAmount / 100).toLocaleString('es-AR')
                              : '--'}
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-500">Ya pagado</span>
                          <span className="font-medium text-green-600">
                            ${paymentSummary
                              ? (paymentSummary.paidAmount / 100).toLocaleString('es-AR')
                              : '--'}
                          </span>
                        </div>
                        <div className="flex justify-between border-t pt-2">
                          <span className="text-gray-700 font-medium">Pendiente</span>
                          <span className="font-bold text-orange-600">
                            ${paymentSummary
                              ? (paymentSummary.pendingAmount / 100).toLocaleString('es-AR')
                              : '--'}
                          </span>
                        </div>
                      </div>
                    </>
                  )}
                </div>
              )}

              {/* Step 2: Método de pago */}
              {paymentStep === 'method' && (
                <div className="space-y-4 mb-6">
                  {availableTypes.length === 0 ? (
                    <p className="text-sm text-center text-muted py-4">No hay medios de pago configurados.</p>
                  ) : (
                    <div>
                      <label className="block text-sm font-medium text-secondary-700 mb-2">Selecciona el tipo de pago</label>
                      <div className="space-y-2">
                        {availableTypes.map(type => (
                          <button
                            key={type}
                            onClick={() => { setSelectedPaymentMethodType(type); setSelectedPaymentMethodId(''); }}
                            className={`w-full flex items-center gap-3 p-3 rounded-lg border-2 transition-all ${
                              selectedPaymentMethodType === type
                                ? 'border-green-500 bg-green-50'
                                : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                            }`}
                          >
                            <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                              selectedPaymentMethodType === type ? 'bg-green-600 text-white' : 'bg-gray-100 text-gray-500'
                            }`}>
                              {type === 'CASH' && '💵'}
                              {type === 'BANK_TRANSFER' && '🏦'}
                              {type === 'PAGO_MOVIL' && '📱'}
                              {type === 'POS' && '💳'}
                              {type === 'OTHER' && '📋'}
                            </div>
                            <span className="font-medium">{TYPE_LABELS[type] ?? type}</span>
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  {selectedPaymentMethodType && (
                    <div>
                      <label className="block text-sm font-medium text-secondary-700 mb-2 mt-4">Selecciona el medio</label>
                      <div className="space-y-2">
                        {paymentMethods
                          .filter(pm => pm.type === selectedPaymentMethodType)
                          .map(pm => (
                            <button
                              key={pm.id}
                              onClick={() => setSelectedPaymentMethodId(pm.id)}
                              className={`w-full text-left p-3 rounded-lg border-2 transition-all ${
                                selectedPaymentMethodId === pm.id
                                  ? 'border-green-500 bg-green-50'
                                  : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                              }`}
                            >
                              <span className="font-medium">{pm.name}</span>
                            </button>
                          ))}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Step 3: Confirmar */}
              {paymentStep === 'confirm' && (
                <div className="space-y-4 mb-6">
                  {/* Resumen de lo que se va a confirmar */}
                  <div className="bg-slate-50 rounded-xl p-4 space-y-3">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-green-100 text-green-600 flex items-center justify-center text-lg">
                        {selectedMethod?.type === 'CASH' && '💵'}
                        {selectedMethod?.type === 'BANK_TRANSFER' && '🏦'}
                        {selectedMethod?.type === 'PAGO_MOVIL' && '📱'}
                        {selectedMethod?.type === 'POS' && '💳'}
                        {selectedMethod?.type === 'OTHER' && '📋'}
                      </div>
                      <div>
                        <p className="font-semibold text-slate-800">{selectedMethod?.name}</p>
                        <p className="text-sm text-slate-500">{TYPE_LABELS[selectedMethod?.type ?? '']}</p>
                      </div>
                    </div>

                    {/* Datos de pago según tipo */}
                    {config && selectedMethod?.type === 'BANK_TRANSFER' && (
                      <div className="text-sm space-y-1 pl-13">
                        {config.bank && <p><span className="text-slate-500">Banco:</span> {config.bank}</p>}
                        {config.accountNumber && <p><span className="text-slate-500">N° de Cuenta:</span> {config.accountNumber}</p>}
                        {config.idType && config.idNumber && (
                          <p><span className="text-slate-500">{config.idType}:</span> {config.idNumber}</p>
                        )}
                      </div>
                    )}
                    {config && selectedMethod?.type === 'PAGO_MOVIL' && (
                      <div className="text-sm space-y-1 pl-13">
                        {config.bank && <p><span className="text-slate-500">Banco:</span> {config.bank}</p>}
                        {config.phoneNumber && <p><span className="text-slate-500">Teléfono:</span> {config.phoneNumber}</p>}
                        {config.idType && config.idNumber && (
                          <p><span className="text-slate-500">{config.idType}:</span> {config.idNumber}</p>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Monto */}
                  <div className="bg-green-50 rounded-lg p-3 text-center">
                    <p className="text-sm text-green-600">Monto a confirmar</p>
                    <p className="text-2xl font-bold text-green-700">
                      {paymentSummary
                        ? `$${(paymentSummary.pendingAmount / 100).toLocaleString('es-AR', { minimumFractionDigits: 2 })}`
                        : '--'}
                    </p>
                  </div>

                  {/* Referencia */}
                  <div>
                    <label className="block text-sm font-medium text-secondary-700 mb-1">
                      Referencia <span className="text-muted">(opcional)</span>
                    </label>
                    <input
                      type="text"
                      value={paymentReference}
                      onChange={e => setPaymentReference(e.target.value)}
                      placeholder="Número de referencia del pago"
                      className="w-full rounded border border-outline px-3 py-2 text-sm"
                    />
                  </div>
                </div>
              )}

              {/* Navegación */}
              <div className="flex gap-3">
                {paymentStep !== 'summary' && (
                  <button
                    onClick={handleBack}
                    className="flex-1 px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200 transition-colors"
                  >
                    Atrás
                  </button>
                )}
                {paymentStep === 'summary' ? (
                  <button
                    onClick={handlePaymentNext}
                    disabled={stepLoading}
                    className="flex-1 px-4 py-2 text-sm font-medium text-white bg-green-600 rounded-md hover:bg-green-700 transition-colors disabled:opacity-50"
                  >
                    Continuar
                  </button>
                ) : paymentStep === 'method' ? (
                  <button
                    onClick={handleMethodSelect}
                    disabled={!selectedPaymentMethodId}
                    className="flex-1 px-4 py-2 text-sm font-medium text-white bg-green-600 rounded-md hover:bg-green-700 transition-colors disabled:opacity-50 disabled:bg-gray-300"
                  >
                    Continuar
                  </button>
                ) : (
                  <button
                    onClick={handleConfirmPaymentSubmit}
                    disabled={loading || !selectedPaymentMethodId}
                    className="flex-1 px-4 py-2 text-sm font-medium text-white bg-green-600 rounded-md hover:bg-green-700 transition-colors disabled:opacity-50"
                  >
                    {loading ? (
                      <span className="flex items-center justify-center gap-2">
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white" />
                        Confirmando...
                      </span>
                    ) : 'Confirmar Pago'}
                  </button>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Éxito */}
        {showPaymentConfirm && confirmedPayment && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[90] p-4">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-8 animate-scale-in text-center">
              <div className="w-20 h-20 rounded-full bg-green-100 flex items-center justify-center mx-auto mb-4">
                <svg className="w-10 h-10 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <h2 className="text-2xl font-bold text-slate-800 mb-2">¡Pago confirmado!</h2>
              <p className="text-slate-500 mb-6">
                El pago de{' '}
                <span className="font-semibold text-green-600">
                  {paymentSummary
                    ? `$${(paymentSummary.pendingAmount / 100).toLocaleString('es-AR')}`
                    : ''}
                </span>{' '}
                fue registrado correctamente.
              </p>
              <div className="animate-pulse text-sm text-slate-400">Cerrando...</div>
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