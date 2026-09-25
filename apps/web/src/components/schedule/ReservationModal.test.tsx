import React from 'react';
import { render, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { Court } from '~/types/api';

const mocks = vi.hoisted(() => ({
  listBookings: vi.fn(),
  listReservations: vi.fn(),
}));

vi.mock('~/lib/api-client', () => ({
  apiClient: {
    venues: {
      bookings: { list: mocks.listBookings },
      reservations: { list: mocks.listReservations, create: vi.fn() },
    },
    profile: { searchByDocument: vi.fn() },
  },
}));

import { ReservationModal } from './ReservationModal';

const court: Court = {
  id: 'court-1',
  venueId: 'venue-1',
  name: 'Cancha 1',
  sportType: 'PADEL',
  indoor: true,
  lighting: true,
  surfaceType: null,
  status: 'ACTIVE',
  durationMinutes: 60,
  createdAt: '2026-09-25T00:00:00.000Z',
};

describe('ReservationModal availability', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.listBookings.mockResolvedValue({ data: { data: { items: [] } } });
    mocks.listReservations.mockResolvedValue({ data: { data: { items: [] } } });
  });

  it('should request unified bookings so match and blocked occupancy is respected', async () => {
    render(
      <ReservationModal
        venueId="venue-1"
        courts={[court]}
        defaultDate="2026-09-25"
        onClose={vi.fn()}
        onSuccess={vi.fn()}
      />,
    );

    await waitFor(() =>
      expect(mocks.listBookings).toHaveBeenCalledWith('venue-1', {
        courtId: 'court-1',
        from: '2026-09-25',
        to: '2026-09-25',
      }),
    );
    expect(mocks.listReservations).not.toHaveBeenCalled();
  });
});
