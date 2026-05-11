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
    <div className="space-y-6">
      <div className="animate-fade-in">
        <h1 className="page-heading">Torneos</h1>
        <p className="text-body mt-1">Gestiona los torneos del sistema</p>
      </div>

      {/* Status filter tabs */}
      <div className="border-b border-outline animate-fade-in stagger-1">
        <nav className="flex gap-1 -mb-px overflow-x-auto">
          {STATUS_TABS.map((tab) => (
            <button
              key={tab.value}
              onClick={() => handleTabClick(tab.value)}
              className={`
                pb-3 px-4 text-sm font-semibold transition-all duration-200 whitespace-nowrap
                ${currentStatus === tab.value
                  ? 'border-b-2 border-primary-500 text-primary-600'
                  : 'text-secondary-500 hover:text-secondary-700 hover:border-b-2 hover:border-secondary-300'
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
          <div className="card overflow-hidden animate-fade-in stagger-2">
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-outline">
                <thead className="bg-surface-container">
                  <tr>
                    <th className="px-4 py-3.5 text-left text-xs font-semibold text-secondary-600 uppercase tracking-wider">
                      Nombre
                    </th>
                    <th className="px-4 py-3.5 text-left text-xs font-semibold text-secondary-600 uppercase tracking-wider">
                      Estado
                    </th>
                    <th className="px-4 py-3.5 text-left text-xs font-semibold text-secondary-600 uppercase tracking-wider">
                      Deporte
                    </th>
                    <th className="px-4 py-3.5 text-left text-xs font-semibold text-secondary-600 uppercase tracking-wider">
                      Categoría
                    </th>
                    <th className="px-4 py-3.5 text-left text-xs font-semibold text-secondary-600 uppercase tracking-wider">
                      Inicio
                    </th>
                    <th className="px-4 py-3.5 text-center text-xs font-semibold text-secondary-600 uppercase tracking-wider">
                      Jugadores
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-surface divide-y divide-outline">
                  {tournaments.map((tournament) => (
                    <TournamentListItemComponent
                      key={tournament.id}
                      tournament={tournament}
                    />
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex justify-center gap-2 animate-fade-in stagger-3">
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
                    w-10 h-10 rounded-xl text-sm font-semibold transition-all duration-200
                    ${currentPage === i + 1
                      ? 'bg-primary-500 text-white shadow-md'
                      : 'bg-surface text-secondary-700 hover:bg-surface-container'
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