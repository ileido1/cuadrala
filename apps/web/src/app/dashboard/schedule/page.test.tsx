import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  bookingsList: vi.fn(),
  courtsList: vi.fn(),
  venueGet: vi.fn(),
}));

vi.mock('~/contexts/venue-context', () => ({
  useVenue: () => ({ currentVenue: { id: 'venue-1', name: 'Club Test' } }),
}));

vi.mock('~/lib/api-client', () => ({
  apiClient: {
    venues: {
      get: mocks.venueGet,
      bookings: { list: mocks.bookingsList },
      courts: { list: mocks.courtsList },
    },
  },
}));

vi.mock('~/components/schedule/ReservationModal', () => ({ ReservationModal: () => null }));
vi.mock('~/components/schedule/BlockSlotModal', () => ({ BlockSlotModal: () => null }));
vi.mock('~/components/schedule/ReservationDetailModal', () => ({ ReservationDetailModal: () => null }));
vi.mock('~/components/schedule/DayPicker', () => ({ DayPicker: () => null }));
vi.mock('~/components/schedule/DayBookingsLayer', () => ({ DayBookingsLayer: () => null }));

import SchedulePage from './page';

describe('SchedulePage booking queries', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.venueGet.mockResolvedValue({ data: { data: { openingHours: null } } });
    mocks.bookingsList.mockResolvedValue({ data: { data: { items: [] } } });
    mocks.courtsList.mockResolvedValue({ data: { data: { items: [] } } });
  });

  it('should request only confirmed bookings for the displayed week', async () => {
    render(<SchedulePage />);

    await waitFor(() => expect(mocks.bookingsList).toHaveBeenCalled());

    expect(mocks.bookingsList).toHaveBeenCalledWith(
      'venue-1',
      expect.objectContaining({ status: 'CONFIRMED', limit: 100 }),
    );
  });
});
