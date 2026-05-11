'use client';

import Link from 'next/link';
import type { TournamentListItem } from '~/types/api';
import { TournamentStatusBadge } from './TournamentStatusBadge';

interface TournamentListItemProps {
  tournament: TournamentListItem;
}

export function TournamentListItemComponent({ tournament }: TournamentListItemProps) {
  const formatDate = (dateString: string | null) => {
    if (!dateString) return '—';
    return new Intl.DateTimeFormat('es-AR', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    }).format(new Date(dateString));
  };

  return (
    <tr className="hover:bg-gray-50">
      <td className="px-4 py-3 whitespace-nowrap text-sm font-medium text-gray-900">
        <Link
          href={`/dashboard/tournaments/${tournament.id}`}
          className="text-primary-600 hover:text-primary-900 hover:underline"
        >
          {tournament.name}
        </Link>
      </td>
      <td className="px-4 py-3 whitespace-nowrap">
        <TournamentStatusBadge status={tournament.status} />
      </td>
      <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-500">
        {tournament.sportName}
      </td>
      <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-500">
        {tournament.categoryName}
      </td>
      <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-500">
        {formatDate(tournament.startsAt)}
      </td>
      <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-500 text-center">
        {tournament.registrationCount} / {tournament.maxParticipants}
      </td>
    </tr>
  );
}