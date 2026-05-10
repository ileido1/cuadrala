'use client';

import type { Court } from '~/types/api';

interface CourtTabsProps {
  courts: Court[];
  selectedCourtId: string | null;
  onSelect: (courtId: string) => void;
  isLoading?: boolean;
}

export function CourtTabs({ courts, selectedCourtId, onSelect, isLoading }: CourtTabsProps) {
  if (isLoading) {
    return (
      <div className="flex gap-2 overflow-x-auto pb-2">
        {[1, 2, 3].map((i) => (
          <div
            key={i}
            className="h-9 w-24 animate-pulse rounded-lg bg-gray-200"
          />
        ))}
      </div>
    );
  }

  if (courts.length === 0) {
    return (
      <p className="text-sm text-gray-500">No hay canchas activas</p>
    );
  }

  return (
    <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-thin">
      {courts.map((court) => {
        const isSelected = court.id === selectedCourtId;
        return (
          <button
            key={court.id}
            onClick={() => onSelect(court.id)}
            className={`shrink-0 rounded-lg px-4 py-2 text-sm font-medium transition-colors ${
              isSelected
                ? 'bg-blue-600 text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            {court.name}
          </button>
        );
      })}
    </div>
  );
}
