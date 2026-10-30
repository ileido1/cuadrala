import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

// Issue #77: the public scoreboard landing must show the standings when the
// tournament is public, and a specific message — never a generic error —
// when the tournament is private or does not exist. Same criterion as
// REQ-TIL-012's reason-specific messages for the invite landing.
const mocks = vi.hoisted(() => ({
  getTournament: vi.fn(),
  getTournamentScoreboard: vi.fn(),
}));

vi.mock('~/lib/api-client', () => ({
  apiClient: {
    getTournament: mocks.getTournament,
    getTournamentScoreboard: mocks.getTournamentScoreboard,
  },
}));

let currentTournamentId = 'tour-1';
vi.mock('next/navigation', () => ({
  useParams: () => ({ tournamentId: currentTournamentId }),
}));

import PublicTournamentScoreboardPage from './page';

function tournamentResponse(overrides: Partial<Record<string, unknown>> = {}) {
  return {
    data: {
      data: {
        tournament: {
          id: 'tour-1',
          name: 'Copa Cuadrala',
          status: 'IN_PROGRESS',
          visibility: 'PUBLIC',
          sportName: 'Pádel',
          categoryName: '4ta Masculino',
          venueName: 'Club Central',
          startsAt: '2026-12-01T10:00:00.000Z',
          ...overrides,
        },
        registrations: [],
      },
    },
  };
}

function scoreboardResponse(rows: Array<Record<string, unknown>>) {
  return { data: { data: { rows } } };
}

describe('PublicTournamentScoreboardPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    currentTournamentId = 'tour-1';
  });

  it('should render the tournament info and standings when the tournament is public', async () => {
    mocks.getTournament.mockResolvedValueOnce(tournamentResponse());
    mocks.getTournamentScoreboard.mockResolvedValueOnce(
      scoreboardResponse([
        {
          rank: 1,
          userId: 'u1',
          name: 'Ana Pérez',
          points: 9,
          gamesPlayed: 3,
          gamesWon: 3,
          gamesLost: 0,
          gamesDrawn: 0,
          pointsFor: 18,
          pointsAgainst: 6,
          difference: 12,
        },
      ]),
    );

    render(<PublicTournamentScoreboardPage />);

    await waitFor(() => expect(screen.getByText('Copa Cuadrala')).toBeInTheDocument());
    expect(mocks.getTournament).toHaveBeenCalledWith('tour-1');
    expect(mocks.getTournamentScoreboard).toHaveBeenCalledWith('tour-1');
    expect(screen.getByText('Ana Pérez')).toBeInTheDocument();
    expect(screen.getByText('9')).toBeInTheDocument();
  });

  it('should show a private-tournament message, not the scoreboard, when the tournament is private', async () => {
    currentTournamentId = 'tour-private';
    mocks.getTournament.mockResolvedValueOnce(
      tournamentResponse({ id: 'tour-private', visibility: 'PRIVATE' }),
    );

    render(<PublicTournamentScoreboardPage />);

    expect(await screen.findByText(/privado/i)).toBeInTheDocument();
    expect(mocks.getTournamentScoreboard).not.toHaveBeenCalled();
    expect(screen.queryByText('Copa Cuadrala')).not.toBeInTheDocument();
  });

  it('should show a not-found message when the tournament does not exist', async () => {
    currentTournamentId = 'tour-missing';
    mocks.getTournament.mockRejectedValueOnce({
      response: { status: 404, data: { code: 'TORNEO_NO_ENCONTRADO', message: 'El torneo indicado no existe.' } },
    });

    render(<PublicTournamentScoreboardPage />);

    expect(await screen.findByText(/no existe/i)).toBeInTheDocument();
    expect(mocks.getTournamentScoreboard).not.toHaveBeenCalled();
  });
});
