'use client';

import { useEffect, useState } from 'react';
import { useVenue } from '~/contexts/venue-context';
import { apiClient } from '~/lib/api-client';
import type { Venue, PendingTransaction, UpcomingMatch } from '~/types/api';

// MOCK DATA - These will be replaced with real API data
const MOCK_STATS = {
  totalIncome: 284500,
  totalIncomeTrend: 12.5,
  courtsCount: 12,
  courtsOccupied: 5,
  occupancyRate: 74,
  occupancyTrend: 5,
};

const MOCK_WEEKLY_INCOME = [
  { day: 'Lun', amount: 45000 },
  { day: 'Mar', amount: 62000 },
  { day: 'Mié', amount: 38000 },
  { day: 'Jue', amount: 55000 },
  { day: 'Vie', amount: 78000 },
  { day: 'Sáb', amount: 95000 },
  { day: 'Dom', amount: 72000 },
];

const MOCK_COURT_OCCUPANCY = [
  { name: 'Cancha 1', occupancy: 85 },
  { name: 'Cancha 2', occupancy: 72 },
  { name: 'Cancha 3', occupancy: 90 },
  { name: 'Cancha 4', occupancy: 45 },
  { name: 'Cancha 5', occupancy: 68 },
  { name: 'Cancha 6', occupancy: 55 },
  { name: 'Cancha 7', occupancy: 38 },
  { name: 'Cancha 8', occupancy: 80 },
];

const MOST_RESERVED_COURT = {
  name: 'Cancha 3',
  hours: 126,
  reservations: 21,
};

interface StatCardProps {
  label: string;
  value: string;
  trend?: number;
  icon: React.ReactNode;
  isMoney?: boolean;
}

function StatCard({ label, value, trend, icon, isMoney }: StatCardProps) {
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
function WeeklyIncomeChart() {
  const maxAmount = Math.max(...MOCK_WEEKLY_INCOME.map(d => d.amount));

  return (
    <div className="card p-6">
      <h3 className="section-heading mb-6">Ingresos por semana</h3>
      <div className="flex items-end justify-between gap-2 h-40">
        {MOCK_WEEKLY_INCOME.map((data, i) => (
          <div key={i} className="flex flex-col items-center gap-2 flex-1">
            <div className="w-full flex items-end justify-center h-32">
              <div
                className="w-full max-w-10 bg-primary rounded-t-md transition-all"
                style={{ height: `${(data.amount / maxAmount) * 100}%` }}
              />
            </div>
            <span className="text-xs text-secondary-500 font-medium">{data.day}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

// Court Occupancy Progress Bars
function CourtOccupancyChart() {
  return (
    <div className="card p-6">
      <h3 className="section-heading mb-4">Ocupación por cancha</h3>
      <div className="space-y-4">
        {MOCK_COURT_OCCUPANCY.map((court, i) => (
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
function MostReservedCourt() {
  return (
    <div className="card p-6 bg-gradient-to-br from-primary to-primary-700 text-white">
      <div className="flex items-start justify-between mb-4">
        <div>
          <p className="text-primary-100 text-sm mb-1">Cancha más reservada</p>
          <h4 className="text-2xl font-bold">{MOST_RESERVED_COURT.name}</h4>
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
          <p className="text-xl font-bold">{MOST_RESERVED_COURT.hours}</p>
        </div>
        <div>
          <p className="text-primary-200 text-xs uppercase tracking-wide mb-1">Reservas</p>
          <p className="text-xl font-bold">{MOST_RESERVED_COURT.reservations}</p>
        </div>
      </div>
    </div>
  );
}

export default function DashboardStats() {
  const { currentVenue } = useVenue();

  const [pendingCount, setPendingCount] = useState<number | null>(null);
  const [courtsCount, setCourtsCount] = useState<number | null>(null);
  const [matchesCount, setMatchesCount] = useState<number | null>(null);

  const [pendingLoading, setPendingLoading] = useState(true);
  const [courtsLoading, setCourtsLoading] = useState(true);
  const [matchesLoading, setMatchesLoading] = useState(true);

  const [pendingError, setPendingError] = useState(false);
  const [courtsError, setCourtsError] = useState(false);
  const [matchesError, setMatchesError] = useState(false);

  useEffect(() => {
    if (!currentVenue) return;

    const venueId = currentVenue.id;

    // Venue details
    apiClient.venues.get(venueId)
      .then((res) => {
        const data = res.data.data as Venue;
        setCourtsCount(data.courtsCount ?? 0);
      })
      .catch(() => setCourtsError(true))
      .finally(() => setCourtsLoading(false));

    // Pending transactions
    apiClient.venues.pendingTransactions(venueId)
      .then((res) => {
        const data = res.data.data as PendingTransaction[];
        setPendingCount(data.length);
      })
      .catch(() => setPendingError(true))
      .finally(() => setPendingLoading(false));

    // Upcoming matches
    apiClient.venues.upcomingMatches(venueId)
      .then((res) => {
        const data = res.data.data as UpcomingMatch[];
        setMatchesCount(data.length);
      })
      .catch(() => setMatchesError(true))
      .finally(() => setMatchesLoading(false));
  }, [currentVenue]);

  // Format currency for display
  const formatCurrency = (value: number) => {
    if (value >= 1000) {
      return `${(value / 1000).toFixed(value % 1000 === 0 ? 0 : 1)}k`;
    }
    return value.toString();
  };

  return (
    <>
      {/* Stats Row - 4 cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
        <div className="animate-fade-in stagger-1">
          <StatCard
            label="INGRESOS TOTALES"
            value={formatCurrency(MOCK_STATS.totalIncome)}
            trend={MOCK_STATS.totalIncomeTrend}
            icon={<MoneyIcon />}
            isMoney
          />
        </div>
        <div className="animate-fade-in stagger-2">
          <StatCard
            label="TOTAL DE CANCHAS"
            value={MOCK_STATS.courtsCount.toString()}
            icon={<CourtIcon />}
          />
        </div>
        <div className="animate-fade-in stagger-3">
          <StatCard
            label="OCUPACIÓN"
            value={`${MOCK_STATS.courtsOccupied}/${MOCK_STATS.courtsCount}`}
            icon={<OccupancyIcon />}
          />
        </div>
        <div className="animate-fade-in stagger-4">
          <StatCard
            label="TASA DE CONVERSIÓN"
            value={`${MOCK_STATS.occupancyRate}%`}
            trend={MOCK_STATS.occupancyTrend}
            icon={<ConversionIcon />}
          />
        </div>
      </div>

      {/* Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-8">
        {/* Left - Weekly Income Chart */}
        <div className="animate-fade-in" style={{ animationDelay: '250ms' }}>
          <WeeklyIncomeChart />
        </div>

        {/* Right - Court Occupancy + Most Reserved */}
        <div className="space-y-6">
          <div className="animate-fade-in" style={{ animationDelay: '300ms' }}>
            <CourtOccupancyChart />
          </div>
          <div className="animate-fade-in" style={{ animationDelay: '350ms' }}>
            <MostReservedCourt />
          </div>
        </div>
      </div>
    </>
  );
}