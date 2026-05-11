'use client';

import { useEffect, useState } from 'react';
import { useVenue } from '~/contexts/venue-context';
import { apiClient } from '~/lib/api-client';
import type { DashboardStatsResponse } from '~/types/api';

interface StatCardProps {
  label: string;
  value: string;
  trend?: number;
  icon: React.ReactNode;
  isMoney?: boolean;
  loading?: boolean;
}

function StatCard({ label, value, trend, icon, isMoney, loading }: StatCardProps) {
  if (loading) {
    return (
      <div className="card p-6 animate-pulse">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-2xl bg-secondary-200" />
            <div>
              <p className="h-3 bg-secondary-200 rounded w-20 mb-2" />
              <div className="h-8 bg-secondary-200 rounded w-16" />
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="card p-6">
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-primary-50 to-primary-100 flex items-center justify-center text-primary-500 shadow-sm">
            {icon}
          </div>
          <div>
            <p className="text-sm text-secondary-500 mb-1">{label}</p>
            <span className="text-3xl font-bold text-secondary-900">
              {isMoney ? '$' : ''}{value}
            </span>
          </div>
        </div>
        {trend !== undefined && (
          <div className={`flex items-center gap-1 text-sm font-semibold ${trend >= 0 ? 'text-primary' : 'text-red-500'}`}>
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={trend >= 0 ? "M5 10l7-7m0 0l7 7m-7-7v18" : "M19 14l-7 7m0 0l-7-7m7 7V3"} />
            </svg>
            <span>{Math.abs(trend)}%</span>
          </div>
        )}
      </div>
    </div>
  );
}

// Icons
const MoneyIcon = () => (
  <svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
  </svg>
);

const CourtIcon = () => (
  <svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 3H5a2 2 0 00-2 2v12a2 2 0 002 2h14a2 2 0 002-2V5a2 2 0 00-2-2h-4M9 3h6m-6 0v16m6-16v16" />
  </svg>
);

const OccupancyIcon = () => (
  <svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 10h16M4 14h16M4 18h16" />
  </svg>
);

const ConversionIcon = () => (
  <svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
  </svg>
);

// Weekly Income Bar Chart
function WeeklyIncomeChart({ data, loading }: { data: { day: string; amount: number }[]; loading?: boolean }) {
  if (loading) {
    return (
      <div className="card p-6">
        <h3 className="section-heading mb-6">Ingresos por semana</h3>
        <div className="flex items-end justify-between gap-2 h-40">
          {[...Array(7)].map((_, i) => (
            <div key={i} className="flex flex-col items-center gap-2 flex-1">
              <div className="w-full flex items-end justify-center h-32">
                <div className="w-full max-w-10 bg-secondary-200 rounded-t animate-pulse" style={{ height: '60%' }} />
              </div>
              <span className="text-xs text-secondary-500 font-medium">---</span>
            </div>
          ))}
        </div>
      </div>
    );
  }

  const maxAmount = Math.max(...data.map(d => d.amount), 1);

  return (
    <div className="card p-6">
      <h3 className="section-heading mb-6">Ingresos por semana</h3>
      <div className="flex items-end justify-between gap-2 h-40">
        {data.map((item, i) => (
          <div key={i} className="flex flex-col items-center gap-2 flex-1">
            <div className="w-full flex items-end justify-center h-32">
              <div
                className="w-full max-w-10 bg-primary rounded-t-md transition-all"
                style={{ height: `${(item.amount / maxAmount) * 100}%` }}
              />
            </div>
            <span className="text-xs text-secondary-500 font-medium">{item.day}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

// Court Occupancy Progress Bars
function CourtOccupancyChart({ data, loading }: { data: { name: string; occupancy: number }[]; loading?: boolean }) {
  if (loading) {
    return (
      <div className="card p-6">
        <h3 className="section-heading mb-4">Ocupación por cancha</h3>
        <div className="space-y-4">
          {[...Array(8)].map((_, i) => (
            <div key={i} className="flex items-center gap-3">
              <div className="h-3 bg-secondary-200 rounded w-20 animate-pulse" />
              <div className="flex-1 h-2 bg-secondary-100 rounded-full overflow-hidden">
                <div className="h-full bg-secondary-200 rounded-full animate-pulse" style={{ width: '60%' }} />
              </div>
              <div className="h-3 bg-secondary-200 rounded w-10 animate-pulse" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="card p-6">
      <h3 className="section-heading mb-4">Ocupación por cancha</h3>
      <div className="space-y-4">
        {data.map((court, i) => (
          <div key={i} className="flex items-center gap-3">
            <span className="text-sm text-secondary-600 w-20 text-right">{court.name}</span>
            <div className="flex-1 h-2 bg-secondary-100 rounded-full overflow-hidden">
              <div
                className="h-full bg-primary rounded-full transition-all"
                style={{ width: `${court.occupancy}%` }}
              />
            </div>
            <span className="text-sm text-secondary-500 w-10">{court.occupancy}%</span>
          </div>
        ))}
      </div>
    </div>
  );
}

// Most Reserved Court Card
function MostReservedCourt({ data, loading }: { data: { name: string; hours: number; reservations: number } | null; loading?: boolean }) {
  if (loading) {
    return (
      <div className="card p-6 bg-gradient-to-br from-primary to-primary-700 animate-pulse">
        <div className="flex items-start justify-between mb-4">
          <div>
            <p className="text-primary-200 text-sm mb-1">Cancha más reservada</p>
            <div className="h-8 bg-white/30 rounded w-32 mb-2" />
          </div>
          <div className="w-12 h-12 rounded-full bg-white/20" />
        </div>
        <div className="flex gap-6">
          <div>
            <p className="text-primary-200 text-xs uppercase tracking-wide mb-1">Horas</p>
            <div className="h-6 bg-white/30 rounded w-8" />
          </div>
          <div>
            <p className="text-primary-200 text-xs uppercase tracking-wide mb-1">Reservas</p>
            <div className="h-6 bg-white/30 rounded w-8" />
          </div>
        </div>
      </div>
    );
  }

  if (!data) return null;

  return (
    <div className="card p-6 bg-gradient-to-br from-primary to-primary-700 text-white">
      <div className="flex items-start justify-between mb-4">
        <div>
          <p className="text-primary-100 text-sm mb-1">Cancha más reservada</p>
          <h4 className="text-2xl font-bold">{data.name}</h4>
        </div>
        <div className="w-12 h-12 rounded-full bg-white/20 flex items-center justify-center">
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" />
          </svg>
        </div>
      </div>
      <div className="flex gap-6">
        <div>
          <p className="text-primary-200 text-xs uppercase tracking-wide mb-1">Horas</p>
          <p className="text-xl font-bold">{data.hours}</p>
        </div>
        <div>
          <p className="text-primary-200 text-xs uppercase tracking-wide mb-1">Reservas</p>
          <p className="text-xl font-bold">{data.reservations}</p>
        </div>
      </div>
    </div>
  );
}

export default function DashboardStats() {
  const { currentVenue } = useVenue();

  const [stats, setStats] = useState<DashboardStatsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    if (!currentVenue) return;

    apiClient.venues.dashboardStats(currentVenue.id)
      .then((res) => {
        const apiData = res.data.data as Omit<DashboardStatsResponse, 'weeklyIncome' | 'courtOccupancy' | 'mostReservedCourt'>;
        // El API devuelve campos base; los gráficos avanzados se enviarán en una v2
        setStats({
          ...apiData,
          weeklyIncome: [],
          courtOccupancy: [],
          mostReservedCourt: null,
        });
      })
      .catch(() => setError(true))
      .finally(() => setLoading(false));
  }, [currentVenue]);

  // Format currency for display (en centavos → pesos)
  const formatCurrency = (value: number) => {
    const pesos = value / 100;
    if (pesos >= 1000) {
      return `${(pesos / 1000).toFixed(pesos % 1000 === 0 ? 0 : 1)}k`;
    }
    return pesos.toString();
  };

  // Default values while loading or error
  const displayStats = stats ?? {
    totalRevenue: 0,
    totalCourts: 0,
    occupancyRate: '0/0',
    conversionRate: 0,
    revenueTrend: 0,
    conversionTrend: 0,
    weeklyIncome: [],
    courtOccupancy: [],
    mostReservedCourt: null,
  };

  return (
    <>
      {/* Stats Row - 4 cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
        <div className="animate-fade-in stagger-1">
          <StatCard
            label="INGRESOS TOTALES"
            value={formatCurrency(displayStats.totalRevenue)}
            trend={displayStats.revenueTrend}
            icon={<MoneyIcon />}
            isMoney
            loading={loading}
          />
        </div>
        <div className="animate-fade-in stagger-2">
          <StatCard
            label="TOTAL DE CANCHAS"
            value={displayStats.totalCourts.toString()}
            icon={<CourtIcon />}
            loading={loading}
          />
        </div>
        <div className="animate-fade-in stagger-3">
          <StatCard
            label="OCUPACIÓN"
            value={displayStats.occupancyRate}
            icon={<OccupancyIcon />}
            loading={loading}
          />
        </div>
        <div className="animate-fade-in stagger-4">
          <StatCard
            label="TASA DE CONVERSIÓN"
            value={`${displayStats.conversionRate}%`}
            trend={displayStats.conversionTrend}
            icon={<ConversionIcon />}
            loading={loading}
          />
        </div>
      </div>

      {/* Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-8">
        {/* Left - Weekly Income Chart */}
        <div className="animate-fade-in" style={{ animationDelay: '250ms' }}>
          <WeeklyIncomeChart
            data={displayStats.weeklyIncome.length > 0 ? displayStats.weeklyIncome : []}
            loading={loading}
          />
        </div>

        {/* Right - Court Occupancy + Most Reserved */}
        <div className="space-y-6">
          <div className="animate-fade-in" style={{ animationDelay: '300ms' }}>
            <CourtOccupancyChart
              data={displayStats.courtOccupancy.length > 0 ? displayStats.courtOccupancy : []}
              loading={loading}
            />
          </div>
          <div className="animate-fade-in" style={{ animationDelay: '350ms' }}>
            <MostReservedCourt
              data={displayStats.mostReservedCourt}
              loading={loading}
            />
          </div>
        </div>
      </div>
    </>
  );
}