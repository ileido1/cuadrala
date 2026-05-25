'use client';

import { useCallback, useEffect, useState } from 'react';
import { PendingPaymentDetailModal } from '~/components/payments/pending-payment-detail-modal';
import { PaymentsList } from '~/components/payments/payments-list';
import { useVenue } from '~/contexts/venue-context';
import { apiClient } from '~/lib/api-client';
import {
  formatMoneyFromMajor,
  resolveCurrencyCode,
} from '~/lib/format-money';
import {
  formatTransactionStatusLabel,
  isPendingApiStatus,
  transactionStatusBadgeClass,
} from '~/lib/transaction-status';
import type {
  TransactionStatsResponse,
  TransactionHistoryItem,
  VenuePendingTransaction,
  VenuePendingTransactionsResponse,
} from '~/types/api';

type PaymentsTab = 'overview' | 'pending';

export default function PaymentsPage() {
  const { currentVenue } = useVenue();
  const [activeTab, setActiveTab] = useState<PaymentsTab>('overview');
  const venueCurrency = resolveCurrencyCode(
    currentVenue?.pricingCurrency,
    currentVenue?.displayCurrency,
  );
  const formatCurrency = (amount: number) =>
    formatMoneyFromMajor(amount, venueCurrency);
  const [stats, setStats] = useState<TransactionStatsResponse | null>(null);
  const [transactions, setTransactions] = useState<TransactionHistoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [showAll, setShowAll] = useState(false);
  const [page, setPage] = useState(1);
  const [selectedPending, setSelectedPending] =
    useState<VenuePendingTransaction | null>(null);
  const [focusPendingId, setFocusPendingId] = useState<string | null>(null);
  const [historyActionError, setHistoryActionError] = useState<string | null>(
    null,
  );

  const loadOverview = useCallback(async () => {
    if (!currentVenue) return;
    const venueId = currentVenue.id;
    setLoading(true);
    setError(false);
    try {
      const [statsRes, historyRes] = await Promise.all([
        apiClient.venues.transactions.stats(venueId),
        apiClient.venues.transactions.history(venueId, 1),
      ]);
      setStats(statsRes.data.data as TransactionStatsResponse);
      const historyData = historyRes.data.data as {
        items: TransactionHistoryItem[];
      };
      setTransactions(historyData.items);
    } catch {
      setError(true);
    } finally {
      setLoading(false);
    }
  }, [currentVenue]);

  useEffect(() => {
    void loadOverview();
  }, [loadOverview]);

  const openPendingFromHistory = async (_transactionId: string) => {
    if (!currentVenue) return;
    setHistoryActionError(null);
    try {
      const response = await apiClient.venues.pendingTransactions(
        currentVenue.id,
      );
      const body = response.data as { data?: VenuePendingTransactionsResponse };
      const items = body.data?.items ?? [];
      const found = items.find((item) => item.id === _transactionId);
      if (!found) {
        setHistoryActionError(
          'Este pago ya no está pendiente. Actualizá la página.',
        );
        return;
      }
      setSelectedPending(found);
      setFocusPendingId(_transactionId);
      setActiveTab('pending');
    } catch {
      setHistoryActionError('No se pudo abrir el detalle del pago.');
    }
  };

  const handlePendingUpdated = () => {
    setSelectedPending(null);
    setFocusPendingId(null);
    void loadOverview();
  };

  const displayedTransactions = showAll ? transactions : transactions.slice(0, 5);
  const maxBarHeight = 120;

  // Default values while loading
  const displayStats = stats ?? {
    weeklyRevenue: 0,
    totalPaid: 0,
    successRate: 0,
    weeklyIncome: [],
    paymentMethods: [],
  };

  const weeklyIncomeData =
    displayStats.weeklyIncome && displayStats.weeklyIncome.length > 0
      ? displayStats.weeklyIncome
      : [{ day: 'Lun', amount: 0 }, { day: 'Mar', amount: 0 }, { day: 'Mié', amount: 0 }, { day: 'Jue', amount: 0 }, { day: 'Vie', amount: 0 }, { day: 'Sáb', amount: 0 }, { day: 'Dom', amount: 0 }];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="animate-fade-in">
        <h1 className="page-heading">Pagos</h1>
        <p className="text-body mt-1">Resumen de ingresos y transacciones</p>
      </div>

      <div className="flex gap-2 border-b border-[#E5E7EB]">
        <button
          type="button"
          onClick={() => setActiveTab('overview')}
          className={`px-4 py-2 text-sm font-semibold border-b-2 -mb-px ${
            activeTab === 'overview'
              ? 'border-primary-600 text-primary-700'
              : 'border-transparent text-[#64748b]'
          }`}
        >
          Resumen
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('pending')}
          className={`px-4 py-2 text-sm font-semibold border-b-2 -mb-px ${
            activeTab === 'pending'
              ? 'border-primary-600 text-primary-700'
              : 'border-transparent text-[#64748b]'
          }`}
        >
          Pendientes
        </button>
      </div>

      {activeTab === 'pending' && currentVenue ? (
        <div className="card p-5 sm:p-6 animate-fade-in">
          <h2 className="section-heading mb-4">Pagos por confirmar</h2>
          <PaymentsList
            venueId={currentVenue.id}
            pricingCurrency={currentVenue.pricingCurrency}
            displayCurrency={currentVenue.displayCurrency}
            focusTransactionId={focusPendingId}
            onFocusConsumed={() => setFocusPendingId(null)}
            externalSelected={selectedPending}
            onExternalSelect={setSelectedPending}
          />
        </div>
      ) : null}

      {currentVenue ? (
        <PendingPaymentDetailModal
          open={selectedPending !== null}
          transaction={selectedPending}
          venueId={currentVenue.id}
          pricingCurrency={currentVenue.pricingCurrency}
          displayCurrency={currentVenue.displayCurrency}
          venueTimezone={currentVenue.timezone ?? 'America/Caracas'}
          onClose={() => setSelectedPending(null)}
          onUpdated={handlePendingUpdated}
        />
      ) : null}

      {activeTab === 'overview' ? (
        <>
      {/* Stats Row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6 animate-fade-in stagger-1">
        {/* Weekly Income Card */}
        <div className="card p-5 sm:p-6">
          {loading ? (
            <div className="animate-pulse">
              <div className="h-3 bg-secondary-200 rounded w-28 mb-2" />
              <div className="h-8 bg-secondary-200 rounded w-32 mt-2" />
            </div>
          ) : (
            <>
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-sm font-semibold text-[#64748b] uppercase tracking-wide">
                    Ingresos Semanales
                  </p>
                  <p className="text-2xl sm:text-3xl font-bold text-[#0F172A] mt-2">
                    {formatCurrency(displayStats.weeklyRevenue)}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2 mt-3">
                  <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-semibold bg-[#dcfce7] text-[#166534]">
                    +0%
                  </span>
                <span className="text-sm text-[#64748b]">vs semana anterior</span>
              </div>
            </>
          )}
        </div>

        {/* Total Paid Card */}
        <div className="card p-5 sm:p-6">
          {loading ? (
            <div className="animate-pulse">
              <div className="h-3 bg-secondary-200 rounded w-20 mb-2" />
              <div className="h-8 bg-secondary-200 rounded w-32 mt-2" />
            </div>
          ) : (
            <>
              <p className="text-sm font-semibold text-[#64748b] uppercase tracking-wide">
                Total Pagado
              </p>
              <p className="text-2xl sm:text-3xl font-bold text-[#0F172A] mt-2">
                {formatCurrency(displayStats.totalPaid)}
              </p>
              <p className="text-sm text-[#64748b] mt-3">Este mes</p>
            </>
          )}
        </div>

        {/* Success Rate Card */}
        <div className="card p-5 sm:p-6">
          {loading ? (
            <div className="animate-pulse">
              <div className="h-3 bg-secondary-200 rounded w-24 mb-2" />
              <div className="h-8 bg-secondary-200 rounded w-20 mt-2" />
            </div>
          ) : (
            <>
              <p className="text-sm font-semibold text-[#64748b] uppercase tracking-wide">
                Tasa de Éxito
              </p>
              <p className="text-2xl sm:text-3xl font-bold text-[#0F172A] mt-2">
                {displayStats.successRate}%
              </p>
              <div className="mt-3">
                <div className="h-2 bg-[#E5E7EB] rounded-full overflow-hidden">
                  <div
                    className="h-full bg-[#17A34A] rounded-full transition-all duration-500"
                    style={{ width: `${displayStats.successRate}%` }}
                  />
                </div>
              </div>
            </>
          )}
        </div>
      </div>

      {/* Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 animate-fade-in stagger-2">
        {/* Bar Chart */}
        <div className="card p-5 sm:p-6">
          <h2 className="section-heading mb-6">Ingresos últimos días de la semana</h2>
          {loading ? (
            <div className="flex items-end justify-between gap-2 sm:gap-4 h-40 sm:h-48">
              {[...Array(7)].map((_, i) => (
                <div key={i} className="flex flex-col items-center flex-1 gap-2">
                  <div className="w-full max-w-[40px] bg-secondary-200 rounded-t animate-pulse" style={{ height: '60%' }} />
                  <span className="text-xs text-secondary-400 font-medium">---</span>
                </div>
              ))}
            </div>
          ) : (
            <div className="flex items-end justify-between gap-2 sm:gap-4 h-40 sm:h-48">
              {weeklyIncomeData.map((data) => {
                const heightPercent = (data.amount / Math.max(...weeklyIncomeData.map(d => d.amount), 1)) * 100;
                return (
                  <div key={data.day} className="flex flex-col items-center flex-1 gap-2">
                    <div
                      className="w-full max-w-[40px] bg-[#17A34A] rounded-t transition-all duration-300 hover:bg-[#15803d]"
                      style={{ height: `${(heightPercent / 100) * maxBarHeight}px` }}
                    />
                    <span className="text-xs text-[#64748b] font-medium">{data.day}</span>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Donut Chart */}
        <div className="card p-5 sm:p-6">
          <h2 className="section-heading mb-6">Métodos de pago</h2>
          {loading ? (
            <div className="flex flex-col sm:flex-row items-center gap-6">
              <div className="w-36 h-36 sm:w-44 sm:h-44 rounded-full bg-secondary-200 animate-pulse" />
              <div className="space-y-3 flex-1">
                {[...Array(3)].map((_, i) => (
                  <div key={i} className="flex items-center gap-3">
                    <div className="w-3 h-3 rounded-full bg-secondary-200" />
                    <div className="h-4 bg-secondary-200 rounded w-24" />
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className="flex flex-col sm:flex-row items-center gap-6">
              {/* Donut */}
              <div className="relative w-36 h-36 sm:w-44 sm:h-44 flex-shrink-0">
                <div
                  className="w-full h-full rounded-full"
                  style={{
                    background: `conic-gradient(
                      ${displayStats.paymentMethods[0]?.color ?? '#17A34A'} 0% ${displayStats.paymentMethods[0]?.percentage ?? 0}%,
                      ${displayStats.paymentMethods[1]?.color ?? '#3B82F6'} ${displayStats.paymentMethods[0]?.percentage ?? 0}% ${(displayStats.paymentMethods[0]?.percentage ?? 0) + (displayStats.paymentMethods[1]?.percentage ?? 0)}%,
                      ${displayStats.paymentMethods[2]?.color ?? '#EAB308'} ${(displayStats.paymentMethods[0]?.percentage ?? 0) + (displayStats.paymentMethods[1]?.percentage ?? 0)}% 100%
                    )`,
                  }}
                />
                <div className="absolute inset-4 bg-white rounded-full" />
              </div>
              {/* Legend */}
              <div className="space-y-3 flex-1">
                {displayStats.paymentMethods.map((item, idx) => (
                  <div key={idx} className="flex items-center gap-3">
                    <div
                      className="w-3 h-3 rounded-full flex-shrink-0"
                      style={{ backgroundColor: item.color }}
                    />
                    <span className="text-sm text-[#475569] flex-1">{item.method}</span>
                    <span className="text-sm font-semibold text-[#0F172A]">{item.percentage}%</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Transaction History */}
      <div className="card overflow-hidden animate-fade-in stagger-3">
        <div className="p-5 sm:p-6 border-b border-[#E5E7EB]">
          <h2 className="section-heading">Historial de transacciones</h2>
          {historyActionError ? (
            <p className="mt-2 text-sm text-red-600">{historyActionError}</p>
          ) : null}
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-[#E5E7EB]">
            <thead className="bg-[#F9FAFB]">
              <tr>
                <th className="px-4 py-3 sm:px-6 sm:py-4 text-left text-xs font-semibold text-[#64748b] uppercase tracking-wider">
                  Fecha
                </th>
                <th className="px-4 py-3 sm:px-6 sm:py-4 text-left text-xs font-semibold text-[#64748b] uppercase tracking-wider">
                  Cliente
                </th>
                <th className="px-4 py-3 sm:px-6 sm:py-4 text-left text-xs font-semibold text-[#64748b] uppercase tracking-wider">
                  Cancha
                </th>
                <th className="px-4 py-3 sm:px-6 sm:py-4 text-left text-xs font-semibold text-[#64748b] uppercase tracking-wider">
                  Monto
                </th>
                <th className="px-4 py-3 sm:px-6 sm:py-4 text-left text-xs font-semibold text-[#64748b] uppercase tracking-wider">
                  Estado
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-[#E5E7EB]">
              {loading ? (
                [...Array(5)].map((_, i) => (
                  <tr key={i}>
                    <td className="px-4 py-3 sm:px-6 sm:py-4"><div className="h-4 bg-secondary-200 rounded w-20 animate-pulse" /></td>
                    <td className="px-4 py-3 sm:px-6 sm:py-4"><div className="h-4 bg-secondary-200 rounded w-28 animate-pulse" /></td>
                    <td className="px-4 py-3 sm:px-6 sm:py-4"><div className="h-4 bg-secondary-200 rounded w-20 animate-pulse" /></td>
                    <td className="px-4 py-3 sm:px-6 sm:py-4"><div className="h-4 bg-secondary-200 rounded w-16 animate-pulse" /></td>
                    <td className="px-4 py-3 sm:px-6 sm:py-4"><div className="h-6 bg-secondary-200 rounded w-16 animate-pulse" /></td>
                  </tr>
                ))
              ) : (
                displayedTransactions.map((transaction) => {
                  const isPending = isPendingApiStatus(transaction.status);
                  return (
                  <tr
                    key={transaction.id}
                    className={`hover:bg-[#F9FAFB] transition-colors ${
                      isPending ? 'cursor-pointer' : ''
                    }`}
                    onClick={
                      isPending
                        ? () => void openPendingFromHistory(transaction.id)
                        : undefined
                    }
                    onKeyDown={
                      isPending
                        ? (e) => {
                            if (e.key === 'Enter' || e.key === ' ') {
                              e.preventDefault();
                              void openPendingFromHistory(transaction.id);
                            }
                          }
                        : undefined
                    }
                    tabIndex={isPending ? 0 : undefined}
                    role={isPending ? 'button' : undefined}
                  >
                    <td className="px-4 py-3 sm:px-6 sm:py-4 whitespace-nowrap text-sm text-[#475569]">
                      {transaction.date}
                    </td>
                    <td className="px-4 py-3 sm:px-6 sm:py-4 whitespace-nowrap text-sm font-medium text-[#0F172A]">
                      {transaction.clientName}
                    </td>
                    <td className="px-4 py-3 sm:px-6 sm:py-4 whitespace-nowrap text-sm text-[#475569]">
                      {transaction.courtName}
                    </td>
                    <td className="px-4 py-3 sm:px-6 sm:py-4 whitespace-nowrap text-sm font-semibold text-[#0F172A]">
                      {formatCurrency(transaction.amount)}
                    </td>
                    <td className="px-4 py-3 sm:px-6 sm:py-4 whitespace-nowrap">
                      <span
                        className={`badge ${transactionStatusBadgeClass(transaction.status)}`}
                      >
                        {formatTransactionStatusLabel(transaction.status)}
                      </span>
                      {isPending ? (
                        <span className="ml-2 text-xs text-primary-600 font-semibold">
                          Revisar →
                        </span>
                      ) : null}
                    </td>
                  </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
        {!loading && !showAll && transactions.length > 5 && (
          <div className="p-4 sm:p-6 border-t border-[#E5E7EB]">
            <button
              onClick={() => setShowAll(true)}
              className="btn btn-outline w-full sm:w-auto"
            >
              Ver más
            </button>
          </div>
        )}
      </div>
        </>
      ) : null}
    </div>
  );
}