'use client';

import { useState, useMemo } from 'react';
import { useVenue } from '~/contexts/venue-context';
import { useVenueCourts } from '~/hooks/useVenueCourts';
import { useCourtSlots } from '~/hooks/useCourtSlots';
import { DayPicker } from '~/components/schedule/DayPicker';
import { CourtTabs } from '~/components/schedule/CourtTabs';
import { SlotGrid } from '~/components/schedule/SlotGrid';

function todayString(): string {
  const d = new Date();
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export default function SchedulePage() {
  const { currentVenue } = useVenue();
  const venueId = currentVenue?.id ?? null;

  const [selectedDate, setSelectedDate] = useState<string>(todayString());
  const [selectedCourtId, setSelectedCourtId] = useState<string | null>(null);

  const { courts, isLoading: courtsLoading } = useVenueCourts(venueId);

  // Default to first court once loaded
  const activeCourtId = useMemo(() => {
    if (selectedCourtId) return selectedCourtId;
    if (courts.length > 0) return courts[0].id;
    return null;
  }, [selectedCourtId, courts]);

  const { slots, isLoading: slotsLoading } = useCourtSlots(
    venueId,
    activeCourtId,
    selectedDate,
  );

  const handleDateChange = (date: string) => {
    setSelectedDate(date);
  };

  const handleCourtSelect = (courtId: string) => {
    setSelectedCourtId(courtId);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between animate-fade-in">
        <div>
          <h1 className="page-heading">Horarios</h1>
          {currentVenue && (
            <p className="text-body mt-1">{currentVenue.name}</p>
          )}
        </div>
        <DayPicker value={selectedDate} onChange={handleDateChange} />
      </div>

      <div className="animate-fade-in stagger-1">
        <CourtTabs
          courts={courts}
          selectedCourtId={activeCourtId}
          onSelect={handleCourtSelect}
          isLoading={courtsLoading}
        />
      </div>

      <div className="animate-fade-in stagger-2">
        <SlotGrid
          slots={slots}
          stepMinutes={30}
          isLoading={slotsLoading}
        />
      </div>
    </div>
  );
}