'use client';

import type { CourtSlot } from '~/types/api';

interface SlotCellProps {
  slot: CourtSlot;
  stepMinutes: number;
}

function formatTime(isoString: string): string {
  const date = new Date(isoString);
  return date.toLocaleTimeString('es-AR', {
    hour: '2-digit',
    minute: '2-digit',
    timeZone: 'America/Argentina/Buenos_Aires',
  });
}

function getReasonLabel(reason: CourtSlot['reason']): string {
  switch (reason) {
    case 'OCCUPIED_MATCH':
      return 'Partido en curso';
    case 'INCOMPATIBLE_VACANT_HOUR':
      return 'Horario incompatible';
    case 'OUT_OF_RANGE':
      return 'Fuera de rango';
    default:
      return '';
  }
}

export function SlotCell({ slot, stepMinutes }: SlotCellProps) {
  const heightPx = Math.max(24, (stepMinutes / 30) * 32);

  let bgClass = 'bg-green-500';
  let interactive = true;

  if (!slot.isAvailable && slot.reason) {
    switch (slot.reason) {
      case 'OCCUPIED_MATCH':
        bgClass = 'bg-red-400';
        break;
      case 'INCOMPATIBLE_VACANT_HOUR':
        bgClass = 'bg-amber-400';
        break;
      case 'OUT_OF_RANGE':
        bgClass = 'bg-gray-300';
        interactive = false;
        break;
    }
  }

  const tooltipContent = (
    <div className={`min-w-[120px] rounded-lg border border-gray-200 bg-white p-2 text-xs shadow-lg ${!interactive ? 'opacity-60' : ''}`}>
      <p className="font-medium text-gray-800">
        {formatTime(slot.start)} – {formatTime(slot.end)}
      </p>
      {slot.reason && (
        <p className={`mt-1 font-medium ${slot.reason === 'OCCUPIED_MATCH' ? 'text-red-600' : slot.reason === 'INCOMPATIBLE_VACANT_HOUR' ? 'text-amber-600' : 'text-gray-500'}`}>
          {getReasonLabel(slot.reason)}
        </p>
      )}
      {slot.isAvailable && (
        <p className="mt-1 font-medium text-green-600">Disponible</p>
      )}
    </div>
  );

  if (!interactive) {
    return (
      <div
        className={`${bgClass} flex items-center justify-center rounded px-2`}
        style={{ minHeight: `${heightPx}px` }}
      >
        <span className="text-xs text-gray-500">{formatTime(slot.start)}</span>
      </div>
    );
  }

  return (
    <div className="group relative" style={{ minHeight: `${heightPx}px` }}>
      <div
        className={`${bgClass} flex cursor-pointer items-center justify-center rounded px-2 transition-opacity group-hover:opacity-80`}
        style={{ minHeight: `${heightPx}px` }}
      >
        <span className="text-xs font-medium text-white">{formatTime(slot.start)}</span>
      </div>
      <div className="absolute left-1/2 top-full z-10 -translate-x-1/2 transform pt-1"
           style={{ display: 'none' }}>
        {tooltipContent}
      </div>
    </div>
  );
}
