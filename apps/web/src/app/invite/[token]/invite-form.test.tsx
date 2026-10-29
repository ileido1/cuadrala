import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

// REQ-TIL-007/008/012: the landing's form must complete the full
// registration (authenticated or guest) by calling the same public
// endpoints the backend contract/mobile app use, never just redirect to a
// store.
const mocks = vi.hoisted(() => ({
  registerViaTournamentInviteLink: vi.fn(),
}));

vi.mock('~/lib/api-client', () => ({
  apiClient: {
    registerViaTournamentInviteLink: mocks.registerViaTournamentInviteLink,
  },
}));

import { InviteForm } from './invite-form';

// Same localStorage stub pattern as `api-client.refresh.test.ts`: Node's own
// global `localStorage` throws without `--localstorage-file`, so jsdom's
// stand-in can't be relied on either — stub it explicitly per test.
const store = new Map<string, string>();

describe('InviteForm', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    store.clear();
    vi.stubGlobal('localStorage', {
      getItem: (k: string) => store.get(k) ?? null,
      setItem: (k: string, v: string) => void store.set(k, v),
      removeItem: (k: string) => void store.delete(k),
      clear: () => store.clear(),
    });
  });

  describe('without an active session (guest)', () => {
    it('should show a validation error and never call the API when the data is invalid', async () => {
      render(<InviteForm token="tok-123" />);

      fireEvent.change(screen.getByLabelText(/nombre/i), { target: { value: '' } });
      fireEvent.change(screen.getByLabelText(/email/i), { target: { value: 'no-es-un-email' } });
      fireEvent.click(screen.getByRole('button', { name: /confirmar inscripci.n/i }));

      await waitFor(() => {
        expect(screen.getAllByRole('alert').length).toBeGreaterThan(0);
      });
      expect(mocks.registerViaTournamentInviteLink).not.toHaveBeenCalled();
    });

    it('should register as guest and show confirmation when the form is valid', async () => {
      mocks.registerViaTournamentInviteLink.mockResolvedValueOnce({
        data: {
          data: {
            registrationId: 'reg-1',
            registrationType: 'GUEST',
            tournamentId: 'tour-1',
            status: 'PENDING',
          },
        },
      });

      render(<InviteForm token="tok-123" />);

      fireEvent.change(screen.getByLabelText(/nombre/i), { target: { value: 'Juan Pérez' } });
      fireEvent.change(screen.getByLabelText(/email/i), { target: { value: 'juan@mail.com' } });
      fireEvent.click(screen.getByRole('button', { name: /confirmar inscripci.n/i }));

      await waitFor(() => {
        expect(mocks.registerViaTournamentInviteLink).toHaveBeenCalledWith('tok-123', {
          name: 'Juan Pérez',
          email: 'juan@mail.com',
        });
      });
      expect(await screen.findByText(/inscripci.n confirmada/i)).toBeInTheDocument();
    });

    it('should show the backend error message when registration fails', async () => {
      mocks.registerViaTournamentInviteLink.mockRejectedValueOnce({
        response: { data: { code: 'CUPOS_AGOTADOS', message: 'No quedan cupos disponibles.' } },
      });

      render(<InviteForm token="tok-123" />);

      fireEvent.change(screen.getByLabelText(/nombre/i), { target: { value: 'Juan Pérez' } });
      fireEvent.change(screen.getByLabelText(/email/i), { target: { value: 'juan@mail.com' } });
      fireEvent.click(screen.getByRole('button', { name: /confirmar inscripci.n/i }));

      expect(await screen.findByText(/no quedan cupos disponibles/i)).toBeInTheDocument();
    });
  });

  describe('with an active session', () => {
    it('should offer to confirm registration without asking for guest data', async () => {
      localStorage.setItem('accessToken', 'token-abc');
      mocks.registerViaTournamentInviteLink.mockResolvedValueOnce({
        data: {
          data: {
            registrationId: 'reg-2',
            registrationType: 'AUTHENTICATED',
            tournamentId: 'tour-1',
            status: 'PENDING',
          },
        },
      });

      render(<InviteForm token="tok-123" />);

      expect(screen.queryByLabelText(/email/i)).not.toBeInTheDocument();
      fireEvent.click(screen.getByRole('button', { name: /confirmar inscripci.n/i }));

      await waitFor(() => {
        expect(mocks.registerViaTournamentInviteLink).toHaveBeenCalledWith('tok-123', {});
      });
      expect(await screen.findByText(/inscripci.n confirmada/i)).toBeInTheDocument();
    });
  });
});
