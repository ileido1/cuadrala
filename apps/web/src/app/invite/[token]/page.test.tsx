import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

// REQ-TIL-012: the landing must show a specific reason per invalid state
// (expired/revoked/exhausted/closed), never a generic error, and must render
// the real registration form — not just a "download the app" placeholder —
// when the link is valid.
const mocks = vi.hoisted(() => ({
  getTournamentInviteLinkPreview: vi.fn(),
}));

vi.mock('~/lib/api-client', () => ({
  apiClient: {
    getTournamentInviteLinkPreview: mocks.getTournamentInviteLinkPreview,
  },
}));

vi.mock('./invite-form', () => ({
  InviteForm: ({ token }: { token: string }) => <div data-testid="invite-form">form for {token}</div>,
}));

let currentToken = 'tok-valid';
vi.mock('next/navigation', () => ({
  useParams: () => ({ token: currentToken }),
}));

import InvitePage from './page';

function validPreview(overrides: Partial<Record<string, unknown>> = {}) {
  return {
    data: {
      data: {
        tournamentId: 'tour-1',
        tournamentName: 'Copa Cuadrala',
        sportName: 'Pádel',
        categoryName: '4ta Masculino',
        venueName: 'Club Central',
        startsAt: '2026-12-01T10:00:00.000Z',
        status: 'OPEN',
        acceptsRegistration: true,
        ...overrides,
      },
    },
  };
}

describe('InvitePage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should render the tournament preview and the registration form when the link is valid', async () => {
    currentToken = 'tok-valid';
    mocks.getTournamentInviteLinkPreview.mockResolvedValueOnce(validPreview());

    render(<InvitePage />);

    await waitFor(() => expect(screen.getByText('Copa Cuadrala')).toBeInTheDocument());
    expect(mocks.getTournamentInviteLinkPreview).toHaveBeenCalledWith('tok-valid');
    expect(screen.getByTestId('invite-form')).toHaveTextContent('tok-valid');
  });

  it('should show a closed-tournament message, not the form, when acceptsRegistration is false', async () => {
    currentToken = 'tok-closed';
    mocks.getTournamentInviteLinkPreview.mockResolvedValueOnce(
      validPreview({ status: 'IN_PROGRESS', acceptsRegistration: false }),
    );

    render(<InvitePage />);

    expect(await screen.findByText(/torneo.*cerr/i)).toBeInTheDocument();
    expect(screen.queryByTestId('invite-form')).not.toBeInTheDocument();
  });

  it('should show an expired-link message when the backend responds ENLACE_INVALIDO', async () => {
    currentToken = 'tok-expired';
    mocks.getTournamentInviteLinkPreview.mockRejectedValueOnce({
      response: { status: 410, data: { code: 'ENLACE_INVALIDO', message: 'El enlace de invitación no es válido.' } },
    });

    render(<InvitePage />);

    expect(await screen.findByText(/expir/i)).toBeInTheDocument();
    expect(screen.queryByTestId('invite-form')).not.toBeInTheDocument();
  });

  it('should show a revoked-link message when the backend responds ENLACE_REVOCADO', async () => {
    currentToken = 'tok-revoked';
    mocks.getTournamentInviteLinkPreview.mockRejectedValueOnce({
      response: { status: 409, data: { code: 'ENLACE_REVOCADO', message: 'El enlace fue revocado.' } },
    });

    render(<InvitePage />);

    expect(await screen.findByText(/revoc/i)).toBeInTheDocument();
    expect(screen.queryByTestId('invite-form')).not.toBeInTheDocument();
  });

  it('should show an exhausted-link message when the backend responds ENLACE_AGOTADO', async () => {
    currentToken = 'tok-exhausted';
    mocks.getTournamentInviteLinkPreview.mockRejectedValueOnce({
      response: { status: 409, data: { code: 'ENLACE_AGOTADO', message: 'El enlace alcanzó su límite de usos.' } },
    });

    render(<InvitePage />);

    expect(await screen.findByText(/agot/i)).toBeInTheDocument();
    expect(screen.queryByTestId('invite-form')).not.toBeInTheDocument();
  });
});
