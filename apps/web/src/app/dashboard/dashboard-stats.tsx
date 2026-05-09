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
}

function StatCard({ label, value, isLoading, hasError, linkHref }: StatCardProps) {
  const content = isLoading ? (
    <div className="animate-pulse">
      <div className="h-4 bg-gray-200 rounded w-24 mb-2" />
      <div className="h-8 bg-gray-200 rounded w-16" />
    </div>
  ) : hasError ? (
    <span className="text-2xl font-bold text-gray-400">—</span>
  ) : (
    <span className="text-2xl font-bold text-gray-900">{value ?? 0}</span>
  );

  const card = (
    <div className="bg-white rounded-lg border border-gray-200 p-6 shadow-sm">
      <p className="text-sm text-gray-500 mb-1">{label}</p>
      {content}
    </div>
  );

  if (linkHref && !isLoading && !hasError) {
    return (
      <a href={linkHref} className="block hover:shadow-md transition-shadow rounded-lg">
        {card}
      </a>
    );
  }

  return card;
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

  if (!currentVenue) {
    return (
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <StatCard label="Pagos pendientes" value={null} isLoading={false} hasError={true} />
        <StatCard label="Canchas" value={null} isLoading={false} hasError={true} />
        <StatCard label="Partidos próximos" value={null} isLoading={false} hasError={true} />
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
      <StatCard
        label="Pagos pendientes"
        value={pendingCount}
        isLoading={pendingLoading}
        hasError={pendingError}
        linkHref="/dashboard/payments"
      />
      <StatCard
        label="Canchas"
        value={courtsCount}
        isLoading={courtsLoading}
        hasError={courtsError}
        linkHref="/dashboard/courts"
      />
      <StatCard
        label="Partidos próximos"
        value={matchesCount}
        isLoading={matchesLoading}
        hasError={matchesError}
        linkHref="/dashboard/schedule"
      />
    </div>
  );
}
