'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { apiClient } from '~/lib/api-client';
import type { TournamentBracket as TournamentBracketType, BracketMatch } from '~/types/api';
import { TournamentBracket } from '~/components/tournaments/TournamentBracket';
import { ScoreEntryModal } from '~/components/tournaments/ScoreEntryModal';
import { LoadingSkeleton } from '~/components/shared/LoadingSkeleton';
import { ErrorState } from '~/components/shared/ErrorState';

type ViewState = 'loading' | 'loaded' | 'error';

interface BracketPageState {
  bracket: TournamentBracketType | null;
  selectedMatch: BracketMatch | null;
  isModalOpen: boolean;
}

export default function TournamentBracketPage() {
  const params = useParams();
  const router = useRouter();
  const tournamentId = params.id as string;

  const [state, setState] = useState<ViewState>('loading');
  const [error, setError] = useState<string | null>(null);
  const [pageState, setPageState] = useState<BracketPageState>({
    bracket: null,
    selectedMatch: null,
    isModalOpen: false,
  });

  const fetchBracket = async () => {
    setState('loading');
    try {
      const response = await apiClient.tournaments.bracket(tournamentId);
      setPageState((prev) => ({ ...prev, bracket: response.data.data }));
      setState('loaded');
      setError(null);
    } catch {
      setState('error');
      setError('Error al cargar el bracket');
    }
  };

  useEffect(() => {
    fetchBracket();
  }, [tournamentId]);

  const handleMatchClick = (match: BracketMatch) => {
    // Only allow clicking matches that are not BYE and not already completed
    if (match.status === 'BYE' || match.status === 'COMPLETED') {
      return;
    }
    // Must have both players to enter score
    if (match.playerA === null || match.playerB === null) {
      return;
    }
    setPageState((prev) => ({ ...prev, selectedMatch: match, isModalOpen: true }));
  };

  const handleModalClose = () => {
    setPageState((prev) => ({ ...prev, selectedMatch: null, isModalOpen: false }));
  };

  const handleScoreSubmit = async (scores: { userId: string; points: number }[]) => {
    if (pageState.selectedMatch === null || pageState.selectedMatch.matchId === null) {
      return;
    }
    try {
      await apiClient.tournaments.submitMatchResult(
        tournamentId,
        pageState.selectedMatch.matchId,
        scores,
      );
      handleModalClose();
      fetchBracket(); // Refresh bracket to show updated scores
    } catch {
      setError('Error al registrar el resultado');
    }
  };

  return (
    <div className="space-y-6">
      <div className="animate-fade-in">
        <div className="flex items-center gap-4 mb-4">
          <Link
            href={`/dashboard/tournaments/${tournamentId}`}
            className="text-secondary-500 hover:text-secondary-700 text-sm"
          >
            ← Detalle del torneo
          </Link>
        </div>
        <h1 className="page-heading">Bracket del torneo</h1>
        {pageState.bracket && (
          <p className="text-body mt-1">{pageState.bracket.tournamentName}</p>
        )}
      </div>

      {state === 'loading' && <LoadingSkeleton rows={10} />}

      {state === 'error' && (
        <ErrorState message={error ?? undefined} onRetry={fetchBracket} />
      )}

      {state === 'loaded' && pageState.bracket && (
        <div className="animate-fade-in stagger-2">
          <div className="card overflow-x-auto p-6">
            <TournamentBracket
              bracket={pageState.bracket}
              onMatchClick={handleMatchClick}
            />
          </div>
        </div>
      )}

      {pageState.selectedMatch && (
        <ScoreEntryModal
          isOpen={pageState.isModalOpen}
          onClose={handleModalClose}
          match={pageState.selectedMatch}
          onSubmit={handleScoreSubmit}
        />
      )}
    </div>
  );
}
