import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { Court } from '~/types/api';

const mocks = vi.hoisted(() => ({
  listBookings: vi.fn(),
  listReservations: vi.fn(),
  createReservation: vi.fn(),
}));

vi.mock('~/lib/api-client', () => ({
  apiClient: {
    venues: {
      bookings: { list: mocks.listBookings },
      reservations: { list: mocks.listReservations, create: mocks.createReservation },
    },
    profile: { searchByDocument: vi.fn() },
  },
}));

import { ReservationModal } from './ReservationModal';

const reservationDate = '2099-09-25';

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

const heldBooking = {
  id: 'booking-held',
  type: 'DIRECT',
  courtId: 'court-1',
  courtName: 'Cancha 1',
  sportId: 'sport-1',
  categoryId: 'category-1',
  scheduledAt: `${reservationDate}T08:00:00.000Z`,
  durationMinutes: 60,
  status: 'HELD',
} as unknown as BookingItem;

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
        defaultDate={reservationDate}
        onClose={vi.fn()}
        onSuccess={vi.fn()}
      />,
    );

    await waitFor(() =>
      expect(mocks.listBookings).toHaveBeenCalledWith('venue-1', {
        courtId: 'court-1',
        from: reservationDate,
        to: reservationDate,
      }),
    );
    expect(mocks.listReservations).not.toHaveBeenCalled();
  });

  it('should mark held bookings as unavailable', async () => {
    mocks.listBookings.mockResolvedValue({
      data: { data: { items: [heldBooking] } },
    });

    render(
      <ReservationModal
        venueId="venue-1"
        courts={[court]}
        defaultDate={reservationDate}
        onClose={vi.fn()}
        onSuccess={vi.fn()}
      />,
    );

    await waitFor(() =>
      expect(
        screen.getByRole('button', { name: /08:00.*ocupado/i }),
      ).toBeDisabled(),
    );
  });

  it('should display the API conflict message when reservation creation fails', async () => {
    mocks.createReservation.mockRejectedValue({
      response: { data: { message: 'Ese horario ya está tomado en esta cancha.' } },
    });

    render(
      <ReservationModal
        venueId="venue-1"
        courts={[court]}
        defaultDate={reservationDate}
        onClose={vi.fn()}
        onSuccess={vi.fn()}
      />,
    );

    fireEvent.change(screen.getByPlaceholderText('Nombre completo *'), {
      target: { value: 'Responsable' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Crear Reserva' }));

    expect(
      await screen.findByText('Ese horario ya está tomado en esta cancha.'),
    ).toBeInTheDocument();
  });
});
