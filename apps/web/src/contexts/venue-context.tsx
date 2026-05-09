'use client';

import {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  type ReactNode,
} from 'react';
import { useSession } from 'next-auth/react';
import { apiClient } from '~/lib/api-client';
import type { Venue, VenueSummary } from '~/types/api';

interface VenueContextValue {
  venues: Venue[];
  currentVenue: Venue | null;
  setCurrentVenue: (venue: Venue) => void;
  isLoading: boolean;
  error: string | null;
}

const VenueContext = createContext<VenueContextValue | undefined>(undefined);

const SESSION_STORAGE_KEY = 'cuadrala_current_venue_id';

export function VenueProvider({ children }: { children: ReactNode }) {
  const { data: session } = useSession();
  const [venues, setVenues] = useState<Venue[]>([]);
  const [currentVenue, setCurrentVenueState] = useState<Venue | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Fetch venues on mount
  useEffect(() => {
    if (!session?.accessToken) return;

    const fetchVenues = async () => {
      try {
        setIsLoading(true);
        setError(null);
        const response = await apiClient.venues.list();
        const venuesData = response.data.data as Venue[];
        setVenues(venuesData);

        // Restore from sessionStorage or default to first venue
        const storedId = sessionStorage.getItem(SESSION_STORAGE_KEY);
        const stored = venuesData.find((v) => v.id === storedId);
        const selected = stored ?? venuesData[0] ?? null;
        setCurrentVenueState(selected);
      } catch {
        setError('No se pudieron cargar las sedes');
        setVenues([]);
      } finally {
        setIsLoading(false);
      }
    };

    fetchVenues();
  }, [session?.accessToken]);

  const setCurrentVenue = useCallback((venue: Venue) => {
    setCurrentVenueState(venue);
    sessionStorage.setItem(SESSION_STORAGE_KEY, venue.id);
  }, []);

  return (
    <VenueContext.Provider
      value={{ venues, currentVenue, setCurrentVenue, isLoading, error }}
    >
      {children}
    </VenueContext.Provider>
  );
}

export function useVenue(): VenueContextValue {
  const context = useContext(VenueContext);
  if (!context) {
    throw new Error('useVenue must be used within VenueProvider');
  }
  return context;
}

export type { Venue, VenueSummary };
