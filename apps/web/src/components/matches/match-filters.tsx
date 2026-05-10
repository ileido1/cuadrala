'use client';

import { useState } from 'react';
import type { MatchStatus } from '~/types/api';

interface MatchFiltersProps {
  onFilterChange: (filters: { date?: string; status?: string; courtId?: string }) => void;
  courtOptions?: { id: string; name: string }[];
}

const DATE_PRESETS = [
  { label: 'Esta semana', value: 'this_week' },
  { label: 'Este mes', value: 'this_month' },
  { label: 'Última semana', value: 'last_week' },
] as const;

export function MatchFilters({ onFilterChange, courtOptions = [] }: MatchFiltersProps) {
  const [selectedPreset, setSelectedPreset] = useState<string>('');
  const [status, setStatus] = useState<string>('');
  const [courtId, setCourtId] = useState<string>('');

  const handlePresetChange = (preset: string) => {
    setSelectedPreset(preset);
    // Convert preset to date filter
    const today = new Date();
    let dateFrom: string | undefined;

    if (preset === 'this_week') {
      const startOfWeek = new Date(today);
      startOfWeek.setDate(today.getDate() - today.getDay());
      dateFrom = startOfWeek.toISOString().split('T')[0];
    } else if (preset === 'this_month') {
      const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
      dateFrom = startOfMonth.toISOString().split('T')[0];
    } else if (preset === 'last_week') {
      const lastWeek = new Date(today);
      lastWeek.setDate(today.getDate() - 7);
      dateFrom = lastWeek.toISOString().split('T')[0];
    }

    onFilterChange({
      date: dateFrom,
      status: status || undefined,
      courtId: courtId || undefined,
    });
  };

  const handleStatusChange = (newStatus: string) => {
    setStatus(newStatus);
    onFilterChange({
      date: selectedPreset ? getDateFromPreset(selectedPreset) : undefined,
      status: newStatus || undefined,
      courtId: courtId || undefined,
    });
  };

  const handleCourtChange = (newCourtId: string) => {
    setCourtId(newCourtId);
    onFilterChange({
      date: selectedPreset ? getDateFromPreset(selectedPreset) : undefined,
      status: status || undefined,
      courtId: newCourtId || undefined,
    });
  };

  return (
    <div className="flex flex-wrap gap-4 mb-6">
      {/* Date Presets */}
      <div className="flex gap-2">
        {DATE_PRESETS.map((preset) => (
          <button
            key={preset.value}
            onClick={() => handlePresetChange(preset.value)}
            className={`px-3 py-1.5 text-sm rounded-md border transition-colors ${
              selectedPreset === preset.value
                ? 'bg-primary-50 border-primary-300 text-primary-700'
                : 'bg-white border-gray-300 text-gray-700 hover:bg-gray-50'
            }`}
          >
            {preset.label}
          </button>
        ))}
        {selectedPreset && (
          <button
            onClick={() => {
              setSelectedPreset('');
              onFilterChange({ status: status || undefined, courtId: courtId || undefined });
            }}
            className="px-3 py-1.5 text-sm text-gray-500 hover:text-gray-700"
          >
            Limpiar
          </button>
        )}
      </div>

      {/* Status Filter */}
      <select
        value={status}
        onChange={(e) => handleStatusChange(e.target.value as MatchStatus | '')}
        className="px-3 py-1.5 text-sm border border-gray-300 rounded-md bg-white text-gray-700 hover:bg-gray-50"
      >
        <option value="">Todos los estados</option>
        <option value="SCHEDULED">Programado</option>
        <option value="IN_PROGRESS">En juego</option>
        <option value="FINISHED">Finalizado</option>
        <option value="CANCELLED">Cancelado</option>
      </select>

      {/* Court Filter */}
      {courtOptions.length > 0 && (
        <select
          value={courtId}
          onChange={(e) => handleCourtChange(e.target.value)}
          className="px-3 py-1.5 text-sm border border-gray-300 rounded-md bg-white text-gray-700 hover:bg-gray-50"
        >
          <option value="">Todas las canchas</option>
          {courtOptions.map((court) => (
            <option key={court.id} value={court.id}>
              {court.name}
            </option>
          ))}
        </select>
      )}
    </div>
  );
}

function getDateFromPreset(preset: string): string | undefined {
  const today = new Date();

  if (preset === 'this_week') {
    const startOfWeek = new Date(today);
    startOfWeek.setDate(today.getDate() - today.getDay());
    return startOfWeek.toISOString().split('T')[0];
  } else if (preset === 'this_month') {
    const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
    return startOfMonth.toISOString().split('T')[0];
  } else if (preset === 'last_week') {
    const lastWeek = new Date(today);
    lastWeek.setDate(today.getDate() - 7);
    return lastWeek.toISOString().split('T')[0];
  }

  return undefined;
}