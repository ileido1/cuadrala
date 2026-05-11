'use client';

import { useState, useEffect } from 'react';
import type { BracketMatch } from '~/types/api';

interface ScoreEntryModalProps {
  isOpen: boolean;
  onClose: () => void;
  match: BracketMatch;
  onSubmit: (scores: { userId: string; points: number }[]) => Promise<void>;
}

export function ScoreEntryModal({ isOpen, onClose, match, onSubmit }: ScoreEntryModalProps) {
  const [playerAScore, setPlayerAScore] = useState(0);
  const [playerBScore, setPlayerBScore] = useState(0);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Reset form when modal opens with new match
  useEffect(() => {
    if (isOpen) {
      setPlayerAScore(0);
      setPlayerBScore(0);
      setError(null);
    }
  }, [isOpen, match]);

  const handleSubmit = async () => {
    if (playerAScore < 0 || playerBScore < 0) {
      setError('Los puntajes deben ser números positivos');
      return;
    }
    if (playerAScore === playerBScore) {
      setError('No puede haber empate');
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      const scores: { userId: string; points: number }[] = [];
      if (match.playerA) {
        scores.push({ userId: match.playerA.userId, points: playerAScore });
      }
      if (match.playerB) {
        scores.push({ userId: match.playerB.userId, points: playerBScore });
      }
      await onSubmit(scores);
    } catch {
      setError('Error al enviar el resultado. Intenta de nuevo.');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/50"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="relative bg-white rounded-xl shadow-2xl p-6 w-full max-w-md mx-4 animate-scale-in">
        <h2 className="text-xl font-bold text-gray-900 mb-4">Registrar resultado</h2>

        {/* Player labels and scores */}
        <div className="space-y-4 mb-6">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-gray-700">
              {match.playerA?.displayName ?? 'Jugador A'}
            </span>
            <div className="flex items-center gap-2">
              <input
                type="number"
                min={0}
                value={playerAScore}
                onChange={(e) => setPlayerAScore(parseInt(e.target.value) || 0)}
                className="w-20 px-3 py-2 border border-gray-300 rounded-lg text-center text-lg font-semibold focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
              />
              {playerAScore > playerBScore && match.playerA && (
                <span className="text-xs text-green-600 font-semibold">✓ Ganador</span>
              )}
            </div>
          </div>

          <div className="flex items-center justify-center text-gray-400 text-sm">vs</div>

          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-gray-700">
              {match.playerB?.displayName ?? 'Jugador B'}
            </span>
            <div className="flex items-center gap-2">
              <input
                type="number"
                min={0}
                value={playerBScore}
                onChange={(e) => setPlayerBScore(parseInt(e.target.value) || 0)}
                className="w-20 px-3 py-2 border border-gray-300 rounded-lg text-center text-lg font-semibold focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
              />
              {playerBScore > playerAScore && match.playerB && (
                <span className="text-xs text-green-600 font-semibold">✓ Ganador</span>
              )}
            </div>
          </div>
        </div>

        {/* Winner preview */}
        {playerAScore > 0 || playerBScore > 0 ? (
          <div className={`mb-4 p-3 rounded-lg ${playerAScore === playerBScore ? 'bg-amber-50' : 'bg-green-50'}`}>
            {playerAScore === playerBScore ? (
              <p className="text-amber-700 text-sm">No puede haber empate</p>
            ) : (
              <p className="text-green-700 text-sm">
                Ganador: <span className="font-semibold">
                  {playerAScore > playerBScore
                    ? (match.playerA?.displayName ?? 'Jugador A')
                    : (match.playerB?.displayName ?? 'Jugador B')}
                </span>
              </p>
            )}
          </div>
        ) : null}

        {/* Error message */}
        {error && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg">
            <p className="text-red-700 text-sm">{error}</p>
          </div>
        )}

        {/* Actions */}
        <div className="flex gap-3">
          <button
            onClick={onClose}
            className="flex-1 px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors"
            disabled={isSubmitting}
          >
            Cancelar
          </button>
          <button
            onClick={handleSubmit}
            disabled={isSubmitting || playerAScore === playerBScore || playerAScore < 0 || playerBScore < 0}
            className={`
              flex-1 px-4 py-2 rounded-lg font-semibold transition-colors
              ${isSubmitting || playerAScore === playerBScore || playerAScore < 0 || playerBScore < 0
                ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                : 'bg-primary-500 text-white hover:bg-primary-600'
              }
            `}
          >
            {isSubmitting ? 'Guardando...' : 'Confirmar resultado'}
          </button>
        </div>
      </div>
    </div>
  );
}
