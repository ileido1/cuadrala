'use client';

import { useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { apiClient } from '~/lib/api-client';
import type { TournamentListItem, TournamentStatus } from '~/types/api';
import { TournamentListItemComponent } from '~/components/tournaments/TournamentListItem';
import { LoadingSkeleton } from '~/components/shared/LoadingSkeleton';
import { EmptyState } from '~/components/shared/EmptyState';
import { ErrorState } from '~/components/shared/ErrorState';

type ListState = 'loading' | 'loaded' | 'empty' | 'error';

const STATUS_TABS: { label: string; value: TournamentStatus | 'ALL' }[] = [
  { label: 'Todos', value: 'ALL' },
  { label: 'Borrador', value: 'DRAFT' },
  { label: 'Abierto', value: 'OPEN' },
  { label: 'En curso', value: 'IN_PROGRESS' },
  { label: 'Completado', value: 'COMPLETED' },
  { label: 'Cancelado', value: 'CANCELLED' },
];

export default function TournamentsListPage() {
  const searchParams = useSearchParams();
  const [tournaments, setTournaments] = useState<TournamentListItem[]>([]);
  const [state, setState] = useState<ListState>('loading');
  const [error, setError] = useState<string | null>(null);
  const [totalPages, setTotalPages] = useState(1);

  const currentStatus = (searchParams.get('status') as TournamentStatus | null) ?? 'ALL';
  const currentPage = parseInt(searchParams.get('page') ?? '1', 10);

  const fetchTournaments = async (status?: string, page: number = 1) => {
    setState('loading');
    try {
      const params: { status?: string; page: number; limit: number } = {
        page,
        limit: 20,
      };
      if (status && status !== 'ALL') {
        params.status = status;
      }
      const response = await apiClient.tournaments.list(params);
      const data = response.data.data;
      if (data.items.length === 0) {
        setState('empty');
      } else {
        setTournaments(data.items);
        setTotalPages(Math.ceil(data.pageInfo.total / data.pageInfo.limit));
        setState('loaded');
      }
      setError(null);
    } catch {
      setState('error');
      setError('Error al cargar los torneos');
    }
  };

  useEffect(() => {
    fetchTournaments(currentStatus === 'ALL' ? undefined : currentStatus, currentPage);
  }, [currentStatus, currentPage]);

  const handleTabClick = (status: TournamentStatus | 'ALL') => {
    const params = new URLSearchParams();
    if (status !== 'ALL') {
      params.set('status', status);
    }
    params.set('page', '1');
    const query = params.toString();
    window.history.pushState(null, '', `?${query}`);
    fetchTournaments(status === 'ALL' ? undefined : status, 1);
  };

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-semibold text-gray-900">Torneos</h1>
        <p className="text-gray-500 text-sm mt-1">Gestiona los torneos del sistema</p>
      </div>

      {/* Status filter tabs */}
      <div className="mb-6 border-b border-gray-200">
        <nav className="flex space-x-8">
          {STATUS_TABS.map((tab) => (
            <button
              key={tab.value}
              onClick={() => handleTabClick(tab.value)}
              className={`
                pb-3 px-1 border-b-2 text-sm font-medium transition-colors
                ${
                  currentStatus === tab.value
                    ? 'border-primary-500 text-primary-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }
              `}
            >
              {tab.label}
            </button>
          ))}
        </nav>
      </div>

      {state === 'loading' && <LoadingSkeleton rows={5} />}

      {state === 'error' && <ErrorState message={error ?? undefined} onRetry={() => fetchTournaments(currentStatus === 'ALL' ? undefined : currentStatus, currentPage)} />}

      {state === 'empty' && (
        <EmptyState
          message="No hay torneos"
          description="Los torneos creados aparecerán aquí"
        />
      )}

      {state === 'loaded' && (
        <>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Nombre
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Estado
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Deporte
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Categoría
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Inicio
                  </th>
                  <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Jugadores
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {tournaments.map((tournament) => (
                  <TournamentListItemComponent
                    key={tournament.id}
                    tournament={tournament}
                  />
                ))}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="mt-4 flex justify-center gap-2">
              {Array.from({ length: totalPages }).map((_, i) => (
                <button
                  key={i}
                  onClick={() => {
                    const params = new URLSearchParams(searchParams.toString());
                    params.set('page', String(i + 1));
                    window.history.pushState(null, '', `?${params.toString()}`);
                    fetchTournaments(currentStatus === 'ALL' ? undefined : currentStatus, i + 1);
                  }}
                  className={`
                    px-3 py-1 rounded text-sm font-medium
                    ${
                      currentPage === i + 1
                        ? 'bg-primary-600 text-white'
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    }
                  `}
                >
                  {i + 1}
                </button>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}