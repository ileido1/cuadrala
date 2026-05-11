'use client';

import { useEffect, useState } from 'react';
import { useVenue } from '~/contexts/venue-context';
import { apiClient } from '~/lib/api-client';
import type { Venue, PendingTransaction, UpcomingMatch } from '~/types/api';

interface StatCardProps {
  label: string;
  value: number | null;
  isLoading: boolean;
  hasError: boolean;
  linkHref?: string;
  icon: React.ReactNode;
}

function StatCard({ label, value, isLoading, hasError, linkHref, icon }: StatCardProps) {
  const content = isLoading ? (
    <div className="animate-pulse">
      <div className="flex items-center gap-4 mb-4">
        <div className="w-14 h-14 bg-secondary-200 rounded-2xl" />
        <div className="h-4 bg-secondary-200 rounded w-28" />
      </div>
      <div className="h-9 bg-secondary-200 rounded w-20" />
    </div>
  ) : hasError ? (
    <div className="flex items-center gap-4">
      <div className="w-14 h-14 rounded-2xl bg-secondary-100 flex items-center justify-center">
        <span className="text-2xl text-secondary-400">—</span>
      </div>
      <div>
        <p className="text-sm text-secondary-500">{label}</p>
        <span className="text-xl font-bold text-secondary-400">Error</span>
      </div>
    </div>
  ) : (
    <div className="flex items-center gap-4">
      <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-primary-50 to-primary-100 flex items-center justify-center text-primary-500 shadow-sm">
        {icon}
      </div>
      <div>
        <p className="text-sm text-secondary-500 mb-1">{label}</p>
        <span className="text-3xl font-bold text-secondary-900">{value ?? 0}</span>
      </div>
    </div>
  );

  const card = (
    <div className="card p-6">
      {content}
    </div>
  );

  if (linkHref && !isLoading && !hasError) {
    return (
      <a href={linkHref} className="block card-hover">
        {card}
      </a>
    );
  }

  return card;
}

// Icons for stat cards
const PaymentIcon = () => (
  <svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
  </svg>
);

const CourtIcon = () => (
  <svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 3H5a2 2 0 00-2 2v12a2 2 0 002 2h14a2 2 0 002-2V5a2 2 0 00-2-2h-4M9 3h6m-6 0v16m6-16v16" />
  </svg>
);

const MatchIcon = () => (
  <svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
  </svg>
);

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

  if (!currentVenue) {
    return (
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 sm:gap-6">
        <StatCard label="Pagos pendientes" value={null} isLoading={false} hasError={true} icon={<PaymentIcon />} />
        <StatCard label="Canchas" value={null} isLoading={false} hasError={true} icon={<CourtIcon />} />
        <StatCard label="Partidos próximos" value={null} isLoading={false} hasError={true} icon={<MatchIcon />} />
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 sm:gap-6">
      <StatCard
        label="Pagos pendientes"
        value={pendingCount}
        isLoading={pendingLoading}
        hasError={pendingError}
        linkHref="/dashboard/payments"
        icon={<PaymentIcon />}
      />
      <StatCard
        label="Canchas"
        value={courtsCount}
        isLoading={courtsLoading}
        hasError={courtsError}
        linkHref="/dashboard/courts"
        icon={<CourtIcon />}
      />
      <StatCard
        label="Partidos próximos"
        value={matchesCount}
        isLoading={matchesLoading}
        hasError={matchesError}
        linkHref="/dashboard/schedule"
        icon={<MatchIcon />}
      />
    </div>
  );
}