'use client';

import { useEffect, useState } from 'react';
import { apiClient } from '~/lib/api-client';
import type { Court } from '~/types/api';

interface UseVenueCourtsResult {
  courts: Court[];
  isLoading: boolean;
  error: string | null;
}

export function useVenueCourts(venueId: string | null): UseVenueCourtsResult {
  const [courts, setCourts] = useState<Court[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!venueId) {
      setCourts([]);
      setError(null);
      return;
    }

    let cancelled = false;

    const fetchCourts = async () => {
      setIsLoading(true);
      setError(null);
      try {
        const response = await apiClient.venues.courts.list(venueId, { status: 'ACTIVE' });
        const data = response.data.data as { items: Court[] };
        if (!cancelled) {
          setCourts(data.items ?? []);
        }
      } catch {
        if (!cancelled) {
          setError('No se pudieron cargar las canchas');
          setCourts([]);
        }
      } finally {
        if (!cancelled) {
          setIsLoading(false);
        }
      }
    };

    fetchCourts();

    return () => {
      cancelled = true;
    };
  }, [venueId]);

  return { courts, isLoading, error };
}
