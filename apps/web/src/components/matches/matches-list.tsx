'use client';

import { useState, useEffect, useCallback } from 'react';
import type { MatchListItem, MatchListFilters, MatchDetailDto } from '~/types/api';
import { apiClient } from '~/lib/api-client';
import { MatchStatusBadge } from './match-status-badge';
import { MatchFilters } from './match-filters';
import { MatchDetailModal } from './match-detail-modal';
import { LoadingSkeleton } from '~/components/shared/LoadingSkeleton';
import { ErrorState } from '~/components/shared/ErrorState';
import { EmptyState } from '~/components/shared/EmptyState';

interface MatchesListProps {
  venueId: string;
  courtOptions?: { id: string; name: string }[];
}

export function MatchesList({ venueId, courtOptions = [] }: MatchesListProps) {
  const [matches, setMatches] = useState<MatchListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [limit] = useState(20);
  const [filters, setFilters] = useState<MatchListFilters>({});
  const [selectedMatch, setSelectedMatch] = useState<MatchDetailDto | null>(null);
  const [modalLoading, setModalLoading] = useState(false);

  const fetchMatches = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await apiClient.matches.list({ ...filters, page, limit });
      setMatches(response.data.items ?? []);
      setTotal(response.data.pageInfo?.total ?? 0);
    } catch (err) {
      setError('Error al cargar los partidos');
      console.error('Error fetching matches:', err);
    } finally {
      setLoading(false);
    }
  }, [filters, page, limit]);

  useEffect(() => {
    fetchMatches();
  }, [fetchMatches]);

  const handleFilterChange = (newFilters: { date?: string; status?: string; courtId?: string }) => {
    setFilters(newFilters as MatchListFilters);
    setPage(1);
  };

  const handleRowClick = async (match: MatchListItem) => {
    try {
      setModalLoading(true);
      const response = await apiClient.matches.get(match.id);
      setSelectedMatch(response.data.data ?? response.data);
    } catch (err) {
      console.error('Error fetching match detail:', err);
    } finally {
      setModalLoading(false);
    }
  };

  const handleCloseModal = () => {
    setSelectedMatch(null);
  };

  const totalPages = Math.ceil(total / limit);

  return (
    <div>
      <MatchFilters onFilterChange={handleFilterChange} courtOptions={courtOptions} />

      {loading && <LoadingSkeleton />}

      {error && <ErrorState message={error} onRetry={fetchMatches} />}

      {!loading && !error && matches.length === 0 && (
        <EmptyState
          message="No hay partidos"
          description="No se encontraron partidos con los filtros aplicados"
        />
      )}

      {!loading && !error && matches.length > 0 && (
        <>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Estado
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Fecha/Hora
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Cancha
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Tipo
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Jugadores
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Precio
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {matches.map((match) => (
                  <tr
                    key={match.id}
                    onClick={() => handleRowClick(match)}
                    className="hover:bg-gray-50 cursor-pointer"
                  >
                    <td className="px-4 py-3 whitespace-nowrap">
                      <MatchStatusBadge status={match.status} />
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900">
                      {match.scheduledAt
                        ? new Date(match.scheduledAt).toLocaleString('es-AR', {
                            day: '2-digit',
                            month: 'short',
                            hour: '2-digit',
                            minute: '2-digit',
                          })
                        : 'Sin fecha'}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-500">
                      {match.courtName ?? 'Sin asignar'}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-500">
                      {match.type === 'AMERICANO' ? 'Americano' : 'Regular'}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-500">
                      {match.participantCount}/{match.maxParticipants}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-500">
                      ${(match.pricePerPlayerCents / 100).toFixed(2)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between px-4 py-3 border-t border-gray-200">
              <div className="text-sm text-gray-5z00">
                Mostrando {(page - 1) * limit + 1} - {Math.min(page * limit, total)} de {total}
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page === 1}
                  className="px-3 py-1 text-sm border rounded-md disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
                >
                  Anterior
                </button>
                <button
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  disabled={page === totalPages}
                  className="px-3 py-1 text-sm border rounded-md disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
                >
                  Siguiente
                </button>
              </div>
            </div>
          )}
        </>
      )}

      {/* Match Detail Modal */}
      {selectedMatch && (
        <MatchDetailModal match={selectedMatch} onClose={handleCloseModal} loading={modalLoading} />
      )}
    </div>
  );
}