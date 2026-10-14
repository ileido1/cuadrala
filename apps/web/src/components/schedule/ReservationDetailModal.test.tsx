import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { BookingItem } from '~/types/api';

const mocks = vi.hoisted(() => ({
  getSummary: vi.fn(),
  unblock: vi.fn(),
}));

vi.mock('~/lib/api-client', () => ({
  apiClient: {
    venues: {
      reservations: { transactions: { getSummary: mocks.getSummary } },
      slots: { unblock: mocks.unblock },
    },
  },
}));

vi.mock('./PaymentConfirmDialog', () => ({
  PaymentConfirmDialog: () => null,
}));

import { ReservationDetailModal } from './ReservationDetailModal';

const blockedReservation: BookingItem = {
  id: 'block-1',
  type: 'BLOCKED',
  courtId: 'court-1',
  courtName: 'Cancha 1',
  sportId: 'sport-1',
  categoryId: 'category-1',
  scheduledAt: '2099-09-25T09:30:00.000Z',
  durationMinutes: 90,
  status: 'CONFIRMED',
  paymentStatus: 'UNPAID',
};

describe('ReservationDetailModal blocked slots', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.getSummary.mockReturnValue(new Promise(() => {}));
    mocks.unblock.mockResolvedValue({ data: {} });
  });

  it('should only offer releasing a blocked slot and reload after confirmation', async () => {
    const onClose = vi.fn();
    const onCancel = vi.fn();

    render(
      <ReservationDetailModal
        reservation={blockedReservation}
        venueId="venue-1"
        onClose={onClose}
        onCancel={onCancel}
      />,
    );

    expect(screen.queryByRole('button', { name: 'Cancelar Reserva' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Confirmar Pago' })).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Liberar bloque' }));
    expect(screen.getByRole('heading', { name: 'Liberar bloque' })).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Sí, liberar' }));

    await waitFor(() =>
      expect(mocks.unblock).toHaveBeenCalledWith('venue-1', 'court-1', {
        scheduledAt: '2099-09-25T09:30:00.000Z',
        durationMinutes: 90,
      }),
    );
    expect(onCancel).toHaveBeenCalledTimes(1);
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('should preserve reservation cancellation and payment actions for direct bookings', () => {
    render(
      <ReservationDetailModal
        reservation={{ ...blockedReservation, type: 'DIRECT' }}
        venueId="venue-1"
        onClose={vi.fn()}
        onCancel={vi.fn()}
      />,
    );

    expect(screen.getByRole('button', { name: 'Cancelar Reserva' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Confirmar Pago' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Liberar bloque' })).not.toBeInTheDocument();
  });
});
