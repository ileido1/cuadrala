'use client';

import { useState } from 'react';

// Mock data
const stats = {
  weeklyIncome: 37500,
  weeklyTrend: 12,
  totalPaid: 8000,
  successRate: 87,
};

const weeklyIncomeData = [
  { day: 'Lun', amount: 4200 },
  { day: 'Mar', amount: 5800 },
  { day: 'Mié', amount: 3500 },
  { day: 'Jue', amount: 7200 },
  { day: 'Vie', amount: 8500 },
  { day: 'Sáb', amount: 10500 },
  { day: 'Dom', amount: 6800 },
];

const paymentMethods = [
  { method: 'Transferencia', percentage: 60, color: '#17A34A' },
  { method: 'Tarjeta', percentage: 25, color: '#3B82F6' },
  { method: 'Efectivo', percentage: 15, color: '#EAB308' },
];

const transactions = [
  { id: '1', date: '15/05/2026', client: 'Martín García', court: 'Cancha 1', amount: 2500, status: 'Pagado' },
  { id: '2', date: '15/05/2026', client: 'Laura Sánchez', court: 'Cancha 2', amount: 1800, status: 'Pagado' },
  { id: '3', date: '14/05/2026', client: 'Carlos Ruiz', court: 'Cancha 1', amount: 2500, status: 'Pagado' },
  { id: '4', date: '14/05/2026', client: 'Ana Martínez', court: 'Cancha 3', amount: 3200, status: 'Pendiente' },
  { id: '5', date: '13/05/2026', client: 'Diego López', court: 'Cancha 2', amount: 1800, status: 'Pagado' },
  { id: '6', date: '13/05/2026', client: 'Sofia Torres', court: 'Cancha 1', amount: 2500, status: 'Pagado' },
  { id: '7', date: '12/05/2026', client: 'Pablo Fernández', court: 'Cancha 3', amount: 3200, status: 'Pagado' },
];

const formatCurrency = (amount: number) => {
  return new Intl.NumberFormat('es-AR', {
    style: 'currency',
    currency: 'ARS',
    minimumFractionDigits: 0,
  }).format(amount);
};

export default function PaymentsPage() {
  const [showAll, setShowAll] = useState(false);
  const displayedTransactions = showAll ? transactions : transactions.slice(0, 5);
  const maxBarHeight = 120;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="animate-fade-in">
        <h1 className="page-heading">Pagos</h1>
        <p className="text-body mt-1">Resumen de ingresos y transacciones</p>
      </div>

      {/* Stats Row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6 animate-fade-in stagger-1">
        {/* Weekly Income Card */}
        <div className="card p-5 sm:p-6">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-sm font-semibold text-[#64748b] uppercase tracking-wide">
                Ingresos Semanales
              </p>
              <p className="text-2xl sm:text-3xl font-bold text-[#0F172A] mt-2">
                {formatCurrency(stats.weeklyIncome)}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 mt-3">
            <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-semibold bg-[#dcfce7] text-[#166534]">
              +{stats.weeklyTrend}%
            </span>
            <span className="text-sm text-[#64748b]">vs semana anterior</span>
          </div>
        </div>

        {/* Total Paid Card */}
        <div className="card p-5 sm:p-6">
          <p className="text-sm font-semibold text-[#64748b] uppercase tracking-wide">
            Total Pagado
          </p>
          <p className="text-2xl sm:text-3xl font-bold text-[#0F172A] mt-2">
            {formatCurrency(stats.totalPaid)}
          </p>
          <p className="text-sm text-[#64748b] mt-3">Este mes</p>
        </div>

        {/* Success Rate Card */}
        <div className="card p-5 sm:p-6">
          <p className="text-sm font-semibold text-[#64748b] uppercase tracking-wide">
            Tasa de Éxito
          </p>
          <p className="text-2xl sm:text-3xl font-bold text-[#0F172A] mt-2">
            {stats.successRate}%
          </p>
          <div className="mt-3">
            <div className="h-2 bg-[#E5E7EB] rounded-full overflow-hidden">
              <div
                className="h-full bg-[#17A34A] rounded-full transition-all duration-500"
                style={{ width: `${stats.successRate}%` }}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 animate-fade-in stagger-2">
        {/* Bar Chart */}
        <div className="card p-5 sm:p-6">
          <h2 className="section-heading mb-6">Ingresos últimos días de la semana</h2>
          <div className="flex items-end justify-between gap-2 sm:gap-4 h-40 sm:h-48">
            {weeklyIncomeData.map((data) => {
              const heightPercent = (data.amount / Math.max(...weeklyIncomeData.map(d => d.amount))) * 100;
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
        </div>

        {/* Donut Chart */}
        <div className="card p-5 sm:p-6">
          <h2 className="section-heading mb-6">Métodos de pago</h2>
          <div className="flex flex-col sm:flex-row items-center gap-6">
            {/* Donut */}
            <div className="relative w-36 h-36 sm:w-44 sm:h-44 flex-shrink-0">
              <div
                className="w-full h-full rounded-full"
                style={{
                  background: `conic-gradient(
                    ${paymentMethods[0].color} 0% ${paymentMethods[0].percentage}%,
                    ${paymentMethods[1].color} ${paymentMethods[0].percentage}% ${paymentMethods[0].percentage + paymentMethods[1].percentage}%,
                    ${paymentMethods[2].color} ${paymentMethods[0].percentage + paymentMethods[1].percentage}% 100%
                  )`,
                }}
              />
              <div className="absolute inset-4 bg-white rounded-full" />
            </div>
            {/* Legend */}
            <div className="space-y-3 flex-1">
              {paymentMethods.map((item) => (
                <div key={item.method} className="flex items-center gap-3">
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
        </div>
      </div>

      {/* Transaction History */}
      <div className="card overflow-hidden animate-fade-in stagger-3">
        <div className="p-5 sm:p-6 border-b border-[#E5E7EB]">
          <h2 className="section-heading">Historial de transacciones</h2>
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
              {displayedTransactions.map((transaction) => (
                <tr key={transaction.id} className="hover:bg-[#F9FAFB] transition-colors">
                  <td className="px-4 py-3 sm:px-6 sm:py-4 whitespace-nowrap text-sm text-[#475569]">
                    {transaction.date}
                  </td>
                  <td className="px-4 py-3 sm:px-6 sm:py-4 whitespace-nowrap text-sm font-medium text-[#0F172A]">
                    {transaction.client}
                  </td>
                  <td className="px-4 py-3 sm:px-6 sm:py-4 whitespace-nowrap text-sm text-[#475569]">
                    {transaction.court}
                  </td>
                  <td className="px-4 py-3 sm:px-6 sm:py-4 whitespace-nowrap text-sm font-semibold text-[#0F172A]">
                    {formatCurrency(transaction.amount)}
                  </td>
                  <td className="px-4 py-3 sm:px-6 sm:py-4 whitespace-nowrap">
                    <span
                      className={`badge ${
                        transaction.status === 'Pagado' ? 'badge-success' : 'badge-warning'
                      }`}
                    >
                      {transaction.status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {!showAll && transactions.length > 5 && (
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
    </div>
  );
}