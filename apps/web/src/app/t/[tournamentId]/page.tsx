'use client';

import { useCallback, useEffect, useState } from 'react';
import { useParams } from 'next/navigation';

import {
  apiClient,
  type PublicTournamentSummary,
  type PublicTournamentScoreboardRow,
} from '~/lib/api-client';
import { ErrorState } from '~/components/shared/ErrorState';
import { LoadingSkeleton } from '~/components/shared/LoadingSkeleton';

// Issue #77: the public scoreboard landing. `GET /tournaments/:id` and
// `GET /tournaments/:id/scoreboard` are public for ANY tournament today (no
// visibility gate on the backend yet), so the landing itself decides to hide
// the private ones instead of trusting a 403 that never comes — same
// client-side gating style as REQ-TIL-009's `acceptsRegistration` check on
// the invite landing.
const NOT_FOUND_MESSAGE = 'Este torneo no existe o fue eliminado.';
const PRIVATE_MESSAGE =
  'Este torneo es privado. Pedile al organizador que lo haga público para poder verlo.';
const GENERIC_ERROR_MESSAGE = 'No se pudo cargar el torneo. Intentá de nuevo más tarde.';

const STATUS_LABELS: Record<string, string> = {
  DRAFT: 'Borrador',
  OPEN: 'Inscripción abierta',
  IN_PROGRESS: 'En juego',
  COMPLETED: 'Finalizado',
  CANCELLED: 'Cancelado',
};

type PageState =
  | { status: 'loading' }
  | { status: 'not-found' }
  | { status: 'private' }
  | { status: 'error' }
  | {
      status: 'loaded';
      tournament: PublicTournamentSummary;
      rows: PublicTournamentScoreboardRow[];
    };

function statusLabel(status: string): string {
  return STATUS_LABELS[status] ?? status;
}

function formatDate(dateString: string | null): string {
  if (!dateString) return '—';
  return new Intl.DateTimeFormat('es-AR', {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
  }).format(new Date(dateString));
}

export default function PublicTournamentScoreboardPage() {
  const params = useParams();
  const tournamentId = params.tournamentId as string;

  const [state, setState] = useState<PageState>({ status: 'loading' });

  const fetchTournament = useCallback(async () => {
    setState({ status: 'loading' });
    try {
      const tournamentResponse = await apiClient.getTournament(tournamentId);
      const { tournament } = tournamentResponse.data.data;

      if (tournament.visibility !== 'PUBLIC') {
        setState({ status: 'private' });
        return;
      }

      const scoreboardResponse = await apiClient.getTournamentScoreboard(tournamentId);
      setState({ status: 'loaded', tournament, rows: scoreboardResponse.data.data.rows });
    } catch (_error: unknown) {
      const httpStatus = (_error as { response?: { status?: number } })?.response?.status;
      setState({ status: httpStatus === 404 ? 'not-found' : 'error' });
    }
  }, [tournamentId]);

  useEffect(() => {
    fetchTournament();
  }, [fetchTournament]);

  if (state.status === 'loading') {
    return <LoadingSkeleton rows={4} />;
  }

  if (state.status === 'not-found') {
    return <ErrorState message={NOT_FOUND_MESSAGE} />;
  }

  if (state.status === 'private') {
    return <ErrorState message={PRIVATE_MESSAGE} />;
  }

  if (state.status === 'error') {
    return <ErrorState message={GENERIC_ERROR_MESSAGE} onRetry={fetchTournament} />;
  }

  const { tournament, rows } = state;

  return (
    <div className="max-w-3xl mx-auto p-6">
      <h1 className="text-2xl font-display font-bold mb-1">{tournament.name}</h1>
      <p className="text-secondary-500 mb-1">
        {tournament.sportName} · {tournament.categoryName}
        {tournament.venueName ? ` · ${tournament.venueName}` : ''}
      </p>
      <p className="text-sm text-secondary-500 mb-6">
        {statusLabel(tournament.status)} · Comienza el {formatDate(tournament.startsAt)}
      </p>

      {rows.length === 0 ? (
        <p className="text-secondary-500">Todavía no hay resultados cargados.</p>
      ) : (
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-secondary-500">
              <th className="py-2 pr-2">Pos</th>
              <th className="py-2 pr-2">Jugador/Pareja</th>
              <th className="py-2 pr-2 text-right">Pts</th>
              <th className="py-2 pr-2 text-right">PJ</th>
              <th className="py-2 pr-2 text-right">PG</th>
              <th className="py-2 pr-2 text-right">PP</th>
              <th className="py-2 pr-2 text-right">PE</th>
              <th className="py-2 pr-2 text-right">Dif</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr
                key={row.tournamentRegistrationId ?? row.userId ?? row.name}
                className="border-t border-secondary-100"
              >
                <td className="py-2 pr-2">{row.rank}</td>
                <td className="py-2 pr-2">{row.name}</td>
                <td className="py-2 pr-2 text-right">{row.points}</td>
                <td className="py-2 pr-2 text-right">{row.gamesPlayed}</td>
                <td className="py-2 pr-2 text-right">{row.gamesWon}</td>
                <td className="py-2 pr-2 text-right">{row.gamesLost}</td>
                <td className="py-2 pr-2 text-right">{row.gamesDrawn}</td>
                <td className="py-2 pr-2 text-right">{row.difference}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}
