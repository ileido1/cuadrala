import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { Court } from '~/types/api';

const mocks = vi.hoisted(() => ({
  blockSlot: vi.fn(),
  courtSlots: vi.fn(),
}));

vi.mock('~/lib/api-client', () => ({
  apiClient: {
    venues: {
      slots: { block: mocks.blockSlot },
      courts: { slots: mocks.courtSlots },
    },
  },
}));

import { BlockSlotModal } from './BlockSlotModal';

const blockDate = '2099-09-25';

const court: Court = {
  id: 'court-1',
  venueId: 'venue-1',
  name: 'Cancha 1',
  sportType: 'PADEL',
  indoor: true,
  lighting: true,
  surfaceType: null,
  status: 'ACTIVE',
  durationMinutes: 90,
  createdAt: '2026-09-25T00:00:00.000Z',
};

const availability = {
  courtId: 'court-1',
  date: blockDate,
  durationMinutes: 90,
  stepMinutes: 30,
  slots: [
    { start: '08:00', end: '09:30', isAvailable: false, reason: 'Ocupado' },
    { start: '09:30', end: '11:00', isAvailable: true },
  ],
};

describe('BlockSlotModal availability', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.courtSlots.mockResolvedValue({ data: availability });
    mocks.blockSlot.mockResolvedValue({ data: {} });
  });

  it('should use authoritative availability, submit the court block duration, and send scheduledAt', async () => {
    render(
      <BlockSlotModal
        venueId="venue-1"
        courts={[court]}
        defaultDate={blockDate}
        onClose={vi.fn()}
        onSuccess={vi.fn()}
      />,
    );

    await waitFor(() =>
      expect(mocks.courtSlots).toHaveBeenCalledWith('venue-1', 'court-1', {
        date: blockDate,
        durationMinutes: 90,
      }),
    );

    expect(screen.getByRole('button', { name: /08:00.*ocupado/i })).toBeDisabled();
    fireEvent.click(screen.getByRole('button', { name: /09:30.*11:00/i }));
    fireEvent.click(screen.getByRole('button', { name: 'Bloquear' }));

    await waitFor(() =>
      expect(mocks.blockSlot).toHaveBeenCalledWith('venue-1', 'court-1', {
        scheduledAt: '2099-09-25T09:30:00.000Z',
        durationMinutes: 90,
        notes: undefined,
      }),
    );
  });

  it('should fail closed while availability is loading or unavailable', async () => {
    let resolveSlots!: (value: { data: typeof availability }) => void;
    mocks.courtSlots.mockReturnValue(
      new Promise((resolve) => {
        resolveSlots = resolve;
      }),
    );

    render(
      <BlockSlotModal
        venueId="venue-1"
        courts={[court]}
        defaultDate={blockDate}
        onClose={vi.fn()}
        onSuccess={vi.fn()}
      />,
    );

    expect(screen.getByRole('button', { name: /08:00/i })).toBeDisabled();
    resolveSlots({ data: availability });

    expect(await screen.findByRole('button', { name: /08:00.*ocupado/i })).toBeDisabled();
  });

  it('should display the API message when blocking fails', async () => {
    mocks.blockSlot.mockRejectedValue({
      response: { data: { message: 'Ese horario ya está bloqueado.' } },
    });

    render(
      <BlockSlotModal
        venueId="venue-1"
        courts={[court]}
        defaultDate={blockDate}
        onClose={vi.fn()}
        onSuccess={vi.fn()}
      />,
    );

    await screen.findByRole('button', { name: /09:30.*11:00/i });
    fireEvent.click(screen.getByRole('button', { name: /09:30.*11:00/i }));
    fireEvent.click(screen.getByRole('button', { name: 'Bloquear' }));

    expect(await screen.findByText('Ese horario ya está bloqueado.')).toBeInTheDocument();
  });
});
