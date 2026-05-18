'use client';

import { layoutOverlappingBookings } from '~/lib/schedule-booking-layout';
import {
  WeeklyBookingCard,
  type WeeklyBookingCardModel,
} from './WeeklyBookingCard';

export type DayBookingInput = Omit<
  WeeklyBookingCardModel,
  'layoutColumn' | 'layoutColumnCount'
>;

interface DayBookingsLayerProps {
  bookings: DayBookingInput[];
  cellHeight: number;
  onBookingClick: (booking: DayBookingInput) => void;
}

export function DayBookingsLayer({
  bookings,
  cellHeight,
  onBookingClick,
}: DayBookingsLayerProps) {
  const LAID_OUT = layoutOverlappingBookings(bookings);

  return (
    <div className="relative h-full min-h-full">
      {LAID_OUT.map((booking) => (
        <WeeklyBookingCard
          key={booking.id}
          booking={booking}
          cellHeight={cellHeight}
          onClick={() => {
            const {
              layoutColumn: _layoutColumn,
              layoutColumnCount: _layoutColumnCount,
              ...rest
            } = booking;
            onBookingClick(rest);
          }}
        />
      ))}
    </div>
  );
}
