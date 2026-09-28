import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { Court } from '~/types/api';

const mocks = vi.hoisted(() => ({
  courtSlots: vi.fn(),
  createReservation: vi.fn(),
}));

vi.mock('~/lib/api-client', () => ({
  apiClient: {
    venues: {
      courts: { slots: mocks.courtSlots },
      reservations: { create: mocks.createReservation },
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

const availableCourtSlots = {
  courtId: 'court-1',
  date: reservationDate,
  durationMinutes: 60,
  stepMinutes: 30,
  slots: [
    { start: '08:00', end: '09:00', isAvailable: true },
    { start: '09:00', end: '10:00', isAvailable: true },
  ],
};

describe('ReservationModal availability', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.courtSlots.mockResolvedValue({ data: availableCourtSlots });
  });

  it('should request authoritative court slots with the selected venue, court, date, and duration', async () => {
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
      expect(mocks.courtSlots).toHaveBeenCalledWith('venue-1', 'court-1', {
        date: reservationDate,
        durationMinutes: 60,
      }),
    );
  });

  it('should mark slots unavailable when the authoritative API rejects them', async () => {
    mocks.courtSlots.mockResolvedValue({
      data: {
        ...availableCourtSlots,
        slots: [
          { start: '08:00', end: '09:00', isAvailable: false, reason: 'Ocupado' },
          { start: '09:00', end: '10:00', isAvailable: true },
        ],
      },
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
