'use client';

import Link from 'next/link';
import { useCallback, useEffect, useState } from 'react';
import { useVenue } from '~/contexts/venue-context';
import { apiClient } from '~/lib/api-client';
import type {
  BookingItem,
  Court,
  DashboardStatsResponse,
  TransactionStatsResponse,
} from '~/types/api';
import {
  formatMoneyFromMajor,
  resolveCurrencyCode,
} from '~/lib/format-money';
import { EmptyState } from '~/components/shared/EmptyState';
import { ErrorState } from '~/components/shared/ErrorState';

const EMPTY_WEEKLY_INCOME = [
  { day: 'Lun', amount: 0 },
  { day: 'Mar', amount: 0 },
  { day: 'Mié', amount: 0 },
  { day: 'Jue', amount: 0 },
  { day: 'Vie', amount: 0 },
  { day: 'Sáb', amount: 0 },
  { day: 'Dom', amount: 0 },
];

function getWeekRangeIso(): { from: string; to: string } {
  const NOW = new Date();
  const DAY = NOW.getDay();
  const MONDAY_OFFSET = DAY === 0 ? -6 : 1 - DAY;
  const MONDAY = new Date(NOW);
  MONDAY.setDate(NOW.getDate() + MONDAY_OFFSET);
  const SUNDAY = new Date(MONDAY);
  SUNDAY.setDate(MONDAY.getDate() + 6);
  const FMT = (D: Date) =>
    `${D.getFullYear()}-${String(D.getMonth() + 1).padStart(2, '0')}-${String(D.getDate()).padStart(2, '0')}`;
  return { from: FMT(MONDAY), to: FMT(SUNDAY) };
}

function buildCourtAnalytics(
  _courts: Court[],
  _bookings: BookingItem[],
): Pick<DashboardStatsResponse, 'courtOccupancy' | 'mostReservedCourt'> {
  const CONFIRMED = _bookings.filter((B) => B.status === 'CONFIRMED');
  const BY_COURT = new Map<
    string,
    { count: number; minutes: number; name: string }
  >();

  for (const COURT of _courts) {
    BY_COURT.set(COURT.id, {
      count: 0,
      minutes: 0,
      name: COURT.name,
    });
  }

  for (const BOOKING of CONFIRMED) {
    const ENTRY = BY_COURT.get(BOOKING.courtId);
    if (!ENTRY) continue;
    ENTRY.count += 1;
    ENTRY.minutes += BOOKING.durationMinutes ?? 60;
    if (BOOKING.courtName) {
      ENTRY.name = BOOKING.courtName;
    }
  }

  const MAX_COUNT = Math.max(
    ...Array.from(BY_COURT.values()).map((E) => E.count),
    1,
  );

  const courtOccupancy = _courts.map((COURT) => {
    const ENTRY = BY_COURT.get(COURT.id) ?? {
      count: 0,
      minutes: 0,
      name: COURT.name,
    };
    return {
      name: ENTRY.name,
      occupancy: Math.round((ENTRY.count / MAX_COUNT) * 100),
    };
  });

  let mostReservedCourt: DashboardStatsResponse['mostReservedCourt'] = null;
  for (const ENTRY of BY_COURT.values()) {
    if (
      ENTRY.count > 0
      && (!mostReservedCourt || ENTRY.count > mostReservedCourt.reservations)
    ) {
      mostReservedCourt = {
        name: ENTRY.name,
        reservations: ENTRY.count,
        hours: Math.round(ENTRY.minutes / 60),
      };
    }
  }

  return { courtOccupancy, mostReservedCourt };
}

interface StatCardProps {
  label: string;
  hint?: string;
  value: string;
  trend?: number;
  icon: React.ReactNode;
  loading?: boolean;
}

function StatCard({
  label,
  hint,
  value,
  trend,
  icon,
  loading,
}: StatCardProps) {
  if (loading) {
    return (
      <div className="stat-card p-6 animate-pulse">
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 rounded-2xl bg-secondary-200" />
          <div className="flex-1">
            <div className="h-3 bg-secondary-200 rounded w-24 mb-2" />
            <div className="h-8 bg-secondary-200 rounded w-20" />
          </div>
        </div>
      </div>
    );
  }

  const HAS_TREND = trend !== undefined && trend !== 0;

  return (
    <div className="stat-card p-6 h-full">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-start gap-4 min-w-0">
          <div className="w-14 h-14 shrink-0 rounded-2xl bg-gradient-to-br from-primary-50 to-primary-100 flex items-center justify-center text-primary-600 shadow-sm">
            {icon}
          </div>
          <div className="min-w-0">
            <p className="text-xs font-semibold uppercase tracking-wide text-secondary-500">
              {label}
            </p>
            {hint && (
              <p className="text-[11px] text-secondary-400 mt-0.5 leading-snug">
                {hint}
              </p>
            )}
            <p className="text-2xl sm:text-3xl font-bold text-secondary-900 mt-2 truncate">
              {value}
            </p>
          </div>
        </div>
        {trend !== undefined && (
          <div
            className={`shrink-0 flex flex-col items-end text-xs font-semibold ${
              HAS_TREND
                ? trend > 0
                  ? 'text-primary-600'
                  : 'text-red-500'
                : 'text-secondary-400'
            }`}
          >
            {HAS_TREND ? (
              <>
                <svg
                  className="w-4 h-4"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d={
                      trend > 0
                        ? 'M5 10l7-7m0 0l7 7m-7-7v18'
                        : 'M19 14l-7 7m0 0l-7-7m7 7V3'
                    }
                  />
                </svg>
                <span>{Math.abs(trend)}%</span>
              </>
            ) : (
              <span className="text-[10px] font-medium normal-case">
                sin cambio
              </span>
            )}
            <span className="text-[10px] font-normal text-secondary-400 mt-0.5">
              vs sem. ant.
            </span>
          </div>
        )}
      </div>
    </div>
  );
}

const MoneyIcon = () => (
  <svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={2}
      d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
    />
  </svg>
);

const CourtIcon = () => (
  <svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={2}
      d="M9 3H5a2 2 0 00-2 2v12a2 2 0 002 2h14a2 2 0 002-2V5a2 2 0 00-2-2h-4M9 3h6m-6 0v16m6-16v16"
    />
  </svg>
);

const OccupancyIcon = () => (
  <svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={2}
      d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
    />
  </svg>
);

const ConversionIcon = () => (
  <svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={2}
      d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
    />
  </svg>
);

function WeeklyIncomeChart({
  data,
  loading,
  formatAmount,
}: {
  data: { day: string; amount: number }[];
  loading?: boolean;
  formatAmount: (_n: number) => string;
}) {
  const HAS_DATA = data.some((D) => D.amount > 0);
  const MAX = Math.max(...data.map((D) => D.amount), 1);

  if (loading) {
    return (
      <div className="card p-6">
        <div className="h-5 bg-secondary-200 rounded w-44 mb-6 animate-pulse" />
        <div className="flex items-end justify-between gap-2 h-44">
          {[...Array(7)].map((_, I) => (
            <div key={I} className="flex-1 flex flex-col items-center gap-2">
              <div className="w-full max-w-10 h-28 bg-secondary-200 rounded-t animate-pulse" />
              <div className="h-3 w-6 bg-secondary-200 rounded animate-pulse" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="card p-6 flex flex-col h-full">
      <div className="flex items-start justify-between gap-4 mb-6">
        <div>
          <h3 className="section-heading">Ingresos por día</h3>
          <p className="text-xs text-secondary-500 mt-1">Semana en curso (cobros confirmados)</p>
        </div>
        <Link
          href="/dashboard/payments"
          className="text-xs font-semibold text-primary-600 hover:text-primary-700 whitespace-nowrap"
        >
          Ver pagos →
        </Link>
      </div>

      {!HAS_DATA ? (
        <EmptyState
          message="Sin ingresos esta semana"
          description="Los cobros confirmados aparecerán aquí día a día."
          action={
            <Link href="/dashboard/payments" className="btn btn-primary text-sm min-h-10 px-4">
              Ir a pagos
            </Link>
          }
        />
      ) : (
        <div className="flex items-end justify-between gap-1 sm:gap-2 flex-1 min-h-[11rem]">
          {data.map((ITEM, I) => (
            <div
              key={I}
              className="flex flex-col items-center gap-2 flex-1 min-w-0 group"
            >
              <span className="text-[10px] text-secondary-500 font-medium opacity-0 group-hover:opacity-100 transition-opacity truncate max-w-full">
                {ITEM.amount > 0 ? formatAmount(ITEM.amount) : ''}
              </span>
              <div className="w-full flex items-end justify-center h-28">
                <div
                  className="w-full max-w-10 bg-primary-500 rounded-t-md transition-all group-hover:bg-primary-600"
                  style={{
                    height: `${Math.max((ITEM.amount / MAX) * 100, ITEM.amount > 0 ? 8 : 0)}%`,
                  }}
                  title={`${ITEM.day}: ${formatAmount(ITEM.amount)}`}
                />
              </div>
              <span className="text-xs text-secondary-500 font-medium">
                {ITEM.day}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function CourtOccupancyChart({
  data,
  loading,
  courtsCount,
}: {
  data: { name: string; occupancy: number }[];
  loading?: boolean;
  courtsCount: number;
}) {
  if (loading) {
    return (
      <div className="card p-6">
        <div className="h-5 bg-secondary-200 rounded w-40 mb-4 animate-pulse" />
        <div className="space-y-4">
          {[...Array(Math.min(courtsCount || 4, 6))].map((_, I) => (
            <div key={I} className="flex items-center gap-3 animate-pulse">
              <div className="h-3 bg-secondary-200 rounded w-16" />
              <div className="flex-1 h-2 bg-secondary-100 rounded-full" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  const HAS_ACTIVITY = data.some((D) => D.occupancy > 0);

  return (
    <div className="card p-6">
      <div className="flex items-start justify-between gap-4 mb-4">
        <div>
          <h3 className="section-heading">Actividad por cancha</h3>
          <p className="text-xs text-secondary-500 mt-1">Reservas confirmadas esta semana</p>
        </div>
        <Link
          href="/dashboard/schedule"
          className="text-xs font-semibold text-primary-600 hover:text-primary-700 whitespace-nowrap"
        >
          Agenda →
        </Link>
      </div>

      {data.length === 0 ? (
        <EmptyState
          message="No hay canchas activas"
          description="Creá canchas para ver la actividad por pista."
          action={
            <Link href="/dashboard/courts" className="btn btn-outline text-sm min-h-10 px-4">
              Gestionar canchas
            </Link>
          }
        />
      ) : !HAS_ACTIVITY ? (
        <EmptyState
          message="Sin reservas esta semana"
          description="Cuando confirmes reservas en la agenda, verás la actividad relativa por cancha."
          action={
            <Link href="/dashboard/schedule" className="btn btn-primary text-sm min-h-10 px-4">
              Nueva reserva
            </Link>
          }
        />
      ) : (
        <div className="space-y-3 max-h-64 overflow-y-auto pr-1">
          {data.map((COURT, I) => (
            <div key={I} className="flex items-center gap-3">
              <span className="text-sm text-secondary-700 w-24 truncate text-right shrink-0">
                {COURT.name}
              </span>
              <div className="flex-1 h-2.5 bg-secondary-100 rounded-full overflow-hidden">
                <div
                  className="h-full bg-primary-500 rounded-full transition-all"
                  style={{ width: `${COURT.occupancy}%` }}
                />
              </div>
              <span className="text-xs text-secondary-500 w-10 text-right shrink-0">
                {COURT.occupancy}%
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function MostReservedCourt({
  data,
  loading,
}: {
  data: { name: string; hours: number; reservations: number } | null;
  loading?: boolean;
}) {
  if (loading) {
    return (
      <div className="rounded-[18px] p-6 bg-gradient-to-br from-primary-600 to-primary-800 animate-pulse min-h-[140px]" />
    );
  }

  if (!data) {
    return (
      <div className="card p-6 border-dashed bg-secondary-50/50">
        <p className="text-sm font-semibold text-secondary-700">Cancha destacada</p>
        <p className="text-xs text-secondary-500 mt-1 mb-4">
          La cancha con más reservas de la semana aparecerá aquí.
        </p>
        <Link href="/dashboard/schedule" className="text-sm font-semibold text-primary-600 hover:text-primary-700">
          Ir a la agenda →
        </Link>
      </div>
    );
  }

  return (
    <div className="rounded-[18px] p-6 bg-gradient-to-br from-primary-600 to-primary-800 text-white shadow-card">
      <div className="flex items-start justify-between mb-4">
        <div>
          <p className="text-primary-100 text-xs font-semibold uppercase tracking-wide mb-1">
            Cancha más reservada
          </p>
          <h4 className="text-2xl font-bold">{data.name}</h4>
        </div>
        <div className="w-11 h-11 rounded-full bg-white/15 flex items-center justify-center shrink-0">
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z"
            />
          </svg>
        </div>
      </div>
      <div className="flex gap-8">
        <div>
          <p className="text-primary-200 text-[10px] uppercase tracking-wide mb-0.5">
            Reservas
          </p>
          <p className="text-2xl font-bold">{data.reservations}</p>
        </div>
        <div>
          <p className="text-primary-200 text-[10px] uppercase tracking-wide mb-0.5">
            Horas
          </p>
          <p className="text-2xl font-bold">{data.hours}</p>
        </div>
      </div>
    </div>
  );
}

function QuickActions() {
  const ACTIONS = [
    { href: '/dashboard/schedule', label: 'Agenda', desc: 'Reservas y bloqueos' },
    { href: '/dashboard/payments', label: 'Pagos', desc: 'Cobros y pendientes' },
    { href: '/dashboard/courts', label: 'Canchas', desc: 'Precios y horarios' },
    { href: '/dashboard/settings', label: 'Ajustes', desc: 'Horarios del club' },
  ];

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
      {ACTIONS.map((A) => (
        <Link
          key={A.href}
          href={A.href}
          className="card card-hover p-4 group block"
        >
          <p className="text-sm font-bold text-secondary-900 group-hover:text-primary-700 transition-colors">
            {A.label}
          </p>
          <p className="text-xs text-secondary-500 mt-0.5">{A.desc}</p>
        </Link>
      ))}
    </div>
  );
}

export default function DashboardStats() {
  const { currentVenue } = useVenue();
  const [stats, setStats] = useState<DashboardStatsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  const venueCurrency = resolveCurrencyCode(
    currentVenue?.pricingCurrency,
    currentVenue?.displayCurrency,
  );

  const formatCurrency = useCallback(
    (value: number) => formatMoneyFromMajor(value, venueCurrency),
    [venueCurrency],
  );

  const loadStats = useCallback(() => {
    if (!currentVenue) return;

    setLoading(true);
    setError(false);

    const WEEK = getWeekRangeIso();
    const VENUE_ID = currentVenue.id;

    Promise.all([
      apiClient.venues.dashboardStats(VENUE_ID),
      apiClient.venues.transactions.stats(VENUE_ID),
      apiClient.venues.courts.list(VENUE_ID, { status: 'ACTIVE' }),
      apiClient.venues.bookings.list(VENUE_ID, {
        from: WEEK.from,
        to: WEEK.to,
        limit: 100,
      }),
    ])
      .then(([dashRes, txRes, courtsRes, bookingsRes]) => {
        const DASH = dashRes.data.data as Omit<
          DashboardStatsResponse,
          'weeklyIncome' | 'courtOccupancy' | 'mostReservedCourt'
        >;
        const TX = txRes.data.data as TransactionStatsResponse;
        const COURTS = (
          (courtsRes.data.data as { items: Court[] }).items ?? []
        );
        const BOOKINGS =
          (bookingsRes.data.data as { items: BookingItem[] }).items ?? [];

        const WEEKLY =
          TX.weeklyIncome?.length > 0 ? TX.weeklyIncome : EMPTY_WEEKLY_INCOME;
        const COURT_ANALYTICS = buildCourtAnalytics(COURTS, BOOKINGS);

        setStats({
          ...DASH,
          weeklyIncome: WEEKLY,
          ...COURT_ANALYTICS,
        });
      })
      .catch(() => setError(true))
      .finally(() => setLoading(false));
  }, [currentVenue]);

  useEffect(() => {
    loadStats();
  }, [loadStats]);

  if (!currentVenue) {
    return (
      <EmptyState
        message="Seleccioná una sede"
        description="Elegí un club en el menú lateral para ver el panel."
      />
    );
  }

  if (error && !stats) {
    return <ErrorState onRetry={loadStats} />;
  }

  const DISPLAY = stats ?? {
    totalRevenue: 0,
    totalCourts: 0,
    occupancyRate: '0/0',
    conversionRate: 0,
    revenueTrend: 0,
    conversionTrend: 0,
    weeklyIncome: EMPTY_WEEKLY_INCOME,
    courtOccupancy: [],
    mostReservedCourt: null,
  };

  const WEEKLY_INCOME =
    DISPLAY.weeklyIncome.length > 0
      ? DISPLAY.weeklyIncome
      : EMPTY_WEEKLY_INCOME;

  const TODAY_LABEL = new Date().toLocaleDateString('es-VE', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  });

  return (
    <div className="space-y-8">
      <header className="animate-fade-in flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-primary-600 mb-1">
            {currentVenue.name}
          </p>
          <h1 className="page-heading">Panel de control</h1>
          <p className="text-body mt-1 capitalize">{TODAY_LABEL}</p>
        </div>
        {!loading && (
          <p className="text-sm text-secondary-500">
            Ingresos acumulados:{' '}
            <span className="font-bold text-secondary-900">
              {formatCurrency(DISPLAY.totalRevenue)}
            </span>
          </p>
        )}
      </header>

      <div className="animate-fade-in" style={{ animationDelay: '50ms' }}>
        <QuickActions />
      </div>

      {error && stats && (
        <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800 flex flex-wrap items-center justify-between gap-2">
          <span>No se pudieron actualizar todos los datos.</span>
          <button
            type="button"
            onClick={loadStats}
            className="font-semibold text-amber-900 underline"
          >
            Reintentar
          </button>
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4 sm:gap-5">
        <div className="animate-fade-in stagger-1">
          <StatCard
            label="Ingresos totales"
            hint="Suma histórica de cobros confirmados"
            value={formatCurrency(DISPLAY.totalRevenue)}
            trend={DISPLAY.revenueTrend}
            icon={<MoneyIcon />}
            loading={loading}
          />
        </div>
        <div className="animate-fade-in stagger-2">
          <StatCard
            label="Canchas activas"
            hint="Disponibles para reservar"
            value={String(DISPLAY.totalCourts)}
            icon={<CourtIcon />}
            loading={loading}
          />
        </div>
        <div className="animate-fade-in stagger-3">
          <StatCard
            label="Actividad semanal"
            hint="Canchas con al menos un cobro / total"
            value={DISPLAY.occupancyRate}
            icon={<OccupancyIcon />}
            loading={loading}
          />
        </div>
        <div className="animate-fade-in stagger-4">
          <StatCard
            label="Cobros confirmados"
            hint="% confirmados sobre pendientes + confirmados"
            value={`${DISPLAY.conversionRate}%`}
            trend={DISPLAY.conversionTrend}
            icon={<ConversionIcon />}
            loading={loading}
          />
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="animate-fade-in" style={{ animationDelay: '200ms' }}>
          <WeeklyIncomeChart
            data={WEEKLY_INCOME}
            loading={loading}
            formatAmount={formatCurrency}
          />
        </div>

        <div className="space-y-6 animate-fade-in" style={{ animationDelay: '250ms' }}>
          <CourtOccupancyChart
            data={DISPLAY.courtOccupancy}
            loading={loading}
            courtsCount={DISPLAY.totalCourts}
          />
          <MostReservedCourt
            data={DISPLAY.mostReservedCourt}
            loading={loading}
          />
        </div>
      </div>
    </div>
  );
}
