'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { apiClient } from '~/lib/api-client';
import type { TournamentDetail, Registration } from '~/types/api';
import { TournamentStatusBadge } from '~/components/tournaments/TournamentStatusBadge';
import { StatusTransitionControls } from '~/components/tournaments/StatusTransitionControls';
import { RegistrationListItemComponent } from '~/components/tournaments/RegistrationListItem';
import { LoadingSkeleton } from '~/components/shared/LoadingSkeleton';
import { ErrorState } from '~/components/shared/ErrorState';
import Link from 'next/link';

type DetailState = 'loading' | 'loaded' | 'error';

export default function TournamentDetailPage() {
  const params = useParams();
  const tournamentId = params.id as string;

  const [tournament, setTournament] = useState<TournamentDetail | null>(null);
  const [registrations, setRegistrations] = useState<Registration[]>([]);
  const [state, setState] = useState<DetailState>('loading');
  const [error, setError] = useState<string | null>(null);

  const fetchTournament = async () => {
    setState('loading');
    try {
      const response = await apiClient.tournaments.get(tournamentId);
      const data = response.data.data;
      setTournament(data.tournament);
      setRegistrations(data.registrations);
      setState('loaded');
      setError(null);
    } catch {
      setState('error');
      setError('Error al cargar el torneo');
    }
  };

  useEffect(() => {
    fetchTournament();
  }, [tournamentId]);

  const formatDate = (dateString: string | null) => {
    if (!dateString) return '—';
    return new Intl.DateTimeFormat('es-AR', {
      day: '2-digit',
      month: 'long',
      year: 'numeric',
    }).format(new Date(dateString));
  };

  if (state === 'loading') {
    return (
      <div>
        <div className="mb-4">
          <div className="h-8 w-48 bg-gray-100 rounded animate-pulse mb-2" />
          <div className="h-4 w-32 bg-gray-100 rounded animate-pulse" />
        </div>
        <LoadingSkeleton rows={5} />
      </div>
    );
  }

  if (state === 'error') {
    return (
      <div>
        <Link href="/dashboard/tournaments" className="text-primary-600 hover:underline mb-4 inline-block">
          ← Volver a torneos
        </Link>
        <ErrorState message={error ?? undefined} onRetry={fetchTournament} />
      </div>
    );
  }

  if (!tournament) return null;

  return (
    <div>
      <Link href="/dashboard/tournaments" className="text-primary-600 hover:underline mb-4 inline-block">
        ← Volver a torneos
      </Link>

      {/* Tournament header */}
      <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-2xl font-semibold text-gray-900">{tournament.name}</h1>
            <div className="flex items-center gap-3 mt-2">
              <TournamentStatusBadge status={tournament.status} />
              <span className="text-gray-500 text-sm">
                {tournament.sportName} · {tournament.categoryName}
              </span>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <Link
              href={`/dashboard/tournaments/${tournamentId}/bracket`}
              className="text-primary-600 hover:text-primary-900 text-sm font-medium"
            >
              Ver bracket
            </Link>
            <StatusTransitionControls tournamentId={tournamentId} currentStatus={tournament.status} />
          </div>
        </div>

        <div className="mt-6 grid grid-cols-2 md:grid-cols-4 gap-6">
          <div>
            <p className="text-xs text-gray-500 uppercase tracking-wider">Fecha de inicio</p>
            <p className="mt-1 text-sm font-medium text-gray-900">{formatDate(tournament.startsAt)}</p>
          </div>
          <div>
            <p className="text-xs text-gray-500 uppercase tracking-wider">Jugadores</p>
            <p className="mt-1 text-sm font-medium text-gray-900">
              {tournament.registrationCount} / {tournament.maxParticipants}
            </p>
          </div>
          <div>
            <p className="text-xs text-gray-500 uppercase tracking-wider">Formato</p>
            <p className="mt-1 text-sm font-medium text-gray-900">{tournament.formatPresetName}</p>
          </div>
          <div>
            <p className="text-xs text-gray-500 uppercase tracking-wider">Versión esquema</p>
            <p className="mt-1 text-sm font-medium text-gray-900">{tournament.presetSchemaVersion}</p>
          </div>
        </div>
      </div>

      {/* Registrations table */}
      <div className="bg-white rounded-lg shadow-sm">
        <div className="px-6 py-4 border-b border-gray-200">
          <h2 className="text-lg font-medium text-gray-900">Inscripciones</h2>
        </div>
        {registrations.length === 0 ? (
          <div className="px-6 py-12 text-center text-gray-500">
            No hay inscripciones aún
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Jugador
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Estado
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Fecha de inscripción
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {registrations.map((reg) => (
                  <RegistrationListItemComponent
                    key={reg.id}
                    id={reg.id}
                    userName={reg.userName}
                    status={reg.status}
                    createdAt={reg.createdAt}
                  />
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}