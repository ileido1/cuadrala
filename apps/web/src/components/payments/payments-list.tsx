'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { apiClient } from '~/lib/api-client';
import type { PaginatedPaymentsResponse, PendingPayment, PaymentsFilters } from '~/types/api';
import { PaymentStatusBadge } from '~/components/payments/payment-status-badge';

interface PaymentsListProps {
  venueId: string;
}

type PaymentsState = 'loading' | 'loaded' | 'empty' | 'error';

export function PaymentsList({ venueId }: PaymentsListProps) {
  const router = useRouter();
  const [payments, setPayments] = useState<PendingPayment[]>([]);
  const [state, setState] = useState<PaymentsState>('loading');
  const [error, setError] = useState<string | null>(null);
  const [confirmingId, setConfirmingId] = useState<string | null>(null);
  const [confirmError, setConfirmError] = useState<string | null>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const fetchPayments = async (filters?: PaymentsFilters) => {
    try {
      const response =
        await apiClient.venues.pendingTransactions(venueId, filters);
      const data = response.data as PaginatedPaymentsResponse;
      if (data.data.length === 0) {
        setState('empty');
      } else {
        setPayments(data.data);
        setState('loaded');
      }
      setError(null);
    } catch {
      setState('error');
      setError('Error al cargar los pagos pendientes');
    }
  };

  useEffect(() => {
    fetchPayments();

    // 30s polling
    intervalRef.current = setInterval(() => {
      fetchPayments();
    }, 30000);

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [venueId]);

  const formatAmount = (amount: number, currency: string) => {
    return new Intl.NumberFormat('es-AR', {
      style: 'currency',
      currency,
    }).format(amount / 100);
  };

  const formatDate = (dateString: string) => {
    return new Intl.DateTimeFormat('es-AR', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    }).format(new Date(dateString));
  };

  const handleConfirm = async (payment: PendingPayment) => {
    // Optimistic update
    setPayments((prev) =>
      prev.map((p) =>
        p.id === payment.id ? { ...p, status: 'confirmed' as const } : p
      )
    );
    setConfirmingId(payment.id);
    setConfirmError(null);

    try {
      await apiClient.venues.transactions.confirm(venueId, payment.id);
      setConfirmingId(null);
    } catch {
      // Rollback
      setPayments((prev) =>
        prev.map((p) =>
          p.id === payment.id ? { ...p, status: 'pending' as const } : p
        )
      );
      setConfirmingId(null);
      setConfirmError('Error al confirmar el pago');
    }
  };

  if (state === 'loading') {
    return (
      <div className="space-y-4">
        <div className="animate-pulse space-y-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-16 bg-gray-100 rounded-lg" />
          ))}
        </div>
      </div>
    );
  }

  if (state === 'error') {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center">
        <p className="text-red-600 mb-4">{error}</p>
        <button
          onClick={() => fetchPayments()}
          className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700"
        >
          Reintentar
        </button>
      </div>
    );
  }

  if (state === 'empty') {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center">
        <p className="text-gray-500 text-lg">No hay pagos pendientes</p>
        <p className="text-gray-400 text-sm mt-2">
          Los pagos pendientes aparecerán aquí
        </p>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="min-w-full divide-y divide-gray-200">
        <thead className="bg-gray-50">
          <tr>
            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Partido
            </th>
            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Monto
            </th>
            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Jugador
            </th>
            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Fecha
            </th>
            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Estado
            </th>
            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Acciones
            </th>
          </tr>
        </thead>
        <tbody className="bg-white divide-y divide-gray-200">
          {payments.map((payment) => (
            <tr key={payment.id} className="hover:bg-gray-50">
              <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900">
                {payment.matchLabel}
              </td>
              <td className="px-4 py-3 whitespace-nowrap text-sm font-medium text-gray-900">
                {formatAmount(payment.amount, payment.currency)}
              </td>
              <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-500">
                {payment.player.name}
              </td>
              <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-500">
                {formatDate(payment.createdAt)}
              </td>
              <td className="px-4 py-3 whitespace-nowrap">
                <PaymentStatusBadge status={payment.status} />
              </td>
              <td className="px-4 py-3 whitespace-nowrap text-sm">
                {payment.status === 'pending' ? (
                  <button
                    onClick={() => handleConfirm(payment)}
                    disabled={confirmingId === payment.id}
                    className="text-primary-600 hover:text-primary-900 font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {confirmingId === payment.id ? 'Confirmando...' : 'Confirmar'}
                  </button>
                ) : (
                  <button
                    onClick={() => router.push(`/dashboard/payments/${payment.id}`)}
                    className="text-primary-600 hover:text-primary-900 font-medium"
                  >
                    Ver detalle
                  </button>
                )}
                {confirmError && confirmingId === null && payment.status === 'pending' && (
                  <span className="text-red-600 text-xs ml-2">{confirmError}</span>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
