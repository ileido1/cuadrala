'use client';

import type { CourtSlot } from '~/types/api';
import { SlotCell } from './SlotCell';

interface SlotGridProps {
  slots: CourtSlot[];
  stepMinutes: number;
  isLoading?: boolean;
}

export function SlotGrid({ slots, stepMinutes, isLoading }: SlotGridProps) {
  if (isLoading) {
    return (
      <div className="space-y-2">
        {Array.from({ length: 8 }).map((_, i) => (
          <div
            key={i}
            className="h-8 animate-pulse rounded-lg bg-gray-100"
          />
        ))}
      </div>
    );
  }

  if (slots.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-gray-400">
        <svg
          className="mb-2 h-12 w-12"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={1.5}
            d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M12 2a10 10 0 100 20 10 10 0 000-20z"
          />
        </svg>
        <p className="text-sm">No hay canchas activas</p>
      </div>
    );
  }

  return (
    <div className="space-y-1">
      {slots.map((slot, i) => (
        <SlotCell key={i} slot={slot} stepMinutes={stepMinutes} />
      ))}
    </div>
  );
}
