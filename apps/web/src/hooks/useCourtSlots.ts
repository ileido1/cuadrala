'use client';

import { useEffect, useState } from 'react';
import { apiClient } from '~/lib/api-client';
import type { CourtSlotsResponse } from '~/types/api';

interface UseCourtSlotsResult {
  slots: CourtSlotsResponse['slots'];
  isLoading: boolean;
  error: string | null;
}

export function useCourtSlots(
  venueId: string | null,
  courtId: string | null,
  date: string,
  durationMinutes = 60,
  stepMinutes = 30,
): UseCourtSlotsResult {
  const [slots, setSlots] = useState<CourtSlotsResponse['slots']>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!venueId || !courtId || !date) {
      setSlots([]);
      setError(null);
      return;
    }

    let cancelled = false;

    const fetchSlots = async () => {
      setIsLoading(true);
      setError(null);
      try {
        const response = await apiClient.venues.courts.slots(venueId, courtId, {
          date,
          durationMinutes,
          stepMinutes,
        });
        const data = response.data as CourtSlotsResponse;
        if (!cancelled) {
          setSlots(data.slots ?? []);
        }
      } catch {
        if (!cancelled) {
          setError('No se pudieron cargar los horarios');
          setSlots([]);
        }
      } finally {
        if (!cancelled) {
          setIsLoading(false);
        }
      }
    };

    fetchSlots();

    return () => {
      cancelled = true;
    };
  }, [venueId, courtId, date, durationMinutes, stepMinutes]);

  return { slots, isLoading, error };
}
