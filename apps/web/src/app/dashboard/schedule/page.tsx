'use client';

import { useState, useMemo } from 'react';
import { useVenue } from '~/contexts/venue-context';

// ─── Types ───────────────────────────────────────────────────────────────────

type BookingStatus = 'confirmed' | 'pending' | 'cancelled';

interface Booking {
  id: string;
  playerName: string;
  timeStart: string; // "08:00"
  timeEnd: string;   // "09:00"
  status: BookingStatus;
  courtName?: string;
}

interface DayColumn {
  date: Date;
  dateStr: string;       // "2024-05-11"
  dayLabel: string;      // "Lun 11"
  bookings: Booking[];
}

// ─── Mock data ─────────────────────────────────────────────────────────────

const MOCK_WEEK_BOOKINGS: Booking[] = [
  // Lunes 13
  { id: '1', playerName: 'Juan P.', timeStart: '09:00', timeEnd: '10:00', status: 'confirmed' },
  { id: '2', playerName: 'María G.', timeStart: '11:00', timeEnd: '12:00', status: 'pending' },
  { id: '3', playerName: 'Pedro L.', timeStart: '14:00', timeEnd: '15:00', status: 'cancelled' },
  { id: '4', playerName: 'Laura M.', timeStart: '16:00', timeEnd: '17:00', status: 'confirmed' },
  // Martes 14
  { id: '5', playerName: 'Carlos R.', timeStart: '08:00', timeEnd: '09:00', status: 'confirmed' },
  { id: '6', playerName: 'Ana S.', timeStart: '10:00', timeEnd: '11:00', status: 'pending' },
  { id: '7', playerName: 'Miguel T.', timeStart: '15:00', timeEnd: '16:00', status: 'confirmed' },
  // Miércoles 15
  { id: '8', playerName: 'Sofia V.', timeStart: '09:30', timeEnd: '10:30', status: 'confirmed' },
  { id: '9', playerName: 'Diego H.', timeStart: '13:00', timeEnd: '14:00', status: 'cancelled' },
  { id: '10', playerName: 'Luis F.', timeStart: '17:00', timeEnd: '18:00', status: 'pending' },
  // Jueves 16
  { id: '11', playerName: 'Carmen K.', timeStart: '08:30', timeEnd: '09:30', status: 'confirmed' },
  { id: '12', playerName: 'Pablo N.', timeStart: '12:00', timeEnd: '13:00', status: 'confirmed' },
  // Viernes 17
  { id: '13', playerName: 'Elena J.', timeStart: '10:00', timeEnd: '11:00', status: 'pending' },
  { id: '14', playerName: 'Roberto Q.', timeStart: '14:30', timeEnd: '15:30', status: 'confirmed' },
  { id: '15', playerName: 'Patricia W.', timeStart: '18:00', timeEnd: '19:00', status: 'cancelled' },
  // Sábado 18
  { id: '16', playerName: 'Francisco Z.', timeStart: '09:00', timeEnd: '10:00', status: 'confirmed' },
  { id: '17', playerName: 'Isabel O.', timeStart: '11:00', timeEnd: '12:00', status: 'pending' },
  { id: '18', playerName: 'Antonio B.', timeStart: '16:00', timeEnd: '17:00', status: 'confirmed' },
  // Domingo 19
  { id: '19', playerName: 'Rosa A.', timeStart: '10:00', timeEnd: '11:00', status: 'confirmed' },
  { id: '20', playerName: 'Javier Y.', timeStart: '15:00', timeEnd: '16:00', status: 'pending' },
];

// ─── Helpers ───────────────────────────────────────────────────────────────

const HOURS = Array.from({ length: 16 }, (_, i) => i + 8); // 08:00–23:00

const DAY_NAMES_SHORT = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];
const MONTH_NAMES = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];

function formatTime(hour: number): string {
  return `${String(hour).padStart(2, '0')}:00`;
}

function isToday(date: Date): boolean {
  const today = new Date();
  return (
    date.getDate() === today.getDate() &&
    date.getMonth() === today.getMonth() &&
    date.getFullYear() === today.getFullYear()
  );
}

function buildWeekColumns(baseDateStr: string): DayColumn[] {
  // Parse base date (e.g. "2024-05-13" = Monday)
  const [y, m, d] = baseDateStr.split('-').map(Number);
  const monday = new Date(y, m - 1, d);
  // Adjust to Monday if not Monday
  const dayOfWeek = monday.getDay();
  const mondayOffset = dayOfWeek === 0 ? -6 : dayOfWeek === 0 ? 0 : 1 - dayOfWeek;
  monday.setDate(monday.getDate() + mondayOffset);

  return Array.from({ length: 7 }, (_, i) => {
    const date = new Date(monday);
    date.setDate(monday.getDate() + i);
    const dateStr = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
    const dayIdx = date.getDay();
    const dayLabel = `${DAY_NAMES_SHORT[dayIdx]} ${String(date.getDate()).padStart(2, '0')}`;
    const bookings = MOCK_WEEK_BOOKINGS.filter((b) => {
      // Match booking to day by checking if day of week matches
      // Simplified: assign bookings to days based on day index pattern
      return true; // All bookings shown in mock for demo
    });
    return { date, dateStr, dayLabel, bookings };
  });
}

function getBookingsForDay(bookings: Booking[], dayIndex: number): Booking[] {
  // Distribute mock bookings across week days by modulo
  return bookings.filter((_, idx) => idx % 7 === dayIndex);
}

function getStatusColor(status: BookingStatus): string {
  switch (status) {
    case 'confirmed':  return 'bg-emerald-500';
    case 'pending':    return 'bg-amber-400';
    case 'cancelled':  return 'bg-red-500';
  }
}

function getStatusBadgeClass(status: BookingStatus): string {
  switch (status) {
    case 'confirmed':  return 'badge-success';
    case 'pending':    return 'badge-warning';
    case 'cancelled':  return 'badge-error';
  }
}

// ─── Components ────────────────────────────────────────────────────────────

interface BookingCardProps {
  booking: Booking;
  cellHeight: number;
}

function BookingCard({ booking, cellHeight }: BookingCardProps) {
  const [h, m] = booking.timeStart.split(':').map(Number);
  const startHour = h;
  const durationH = () => {
    const [eh, em] = booking.timeEnd.split(':').map(Number);
    return (eh - h) + (em - m) / 60;
  };
  const heightPct = (durationH() / 1) * cellHeight;
  const topOffset = ((startHour - 8) / 1) * cellHeight;

  return (
    <div
      className={`absolute left-1 right-1 rounded-md px-2 py-1 text-xs font-medium text-white shadow-sm ${getStatusColor(booking.status)}`}
      style={{
        top: `${topOffset}px`,
        height: `${Math.max(heightPct - 4, 20)}px`,
        minHeight: '20px',
      }}
    >
      <span className="block truncate">{booking.playerName}</span>
    </div>
  );
}

interface WeeklyCalendarProps {
  weekColumns: DayColumn[];
  cellHeight: number;
}

function WeeklyCalendar({ weekColumns, cellHeight }: WeeklyCalendarProps) {
  const todayDateStr = useMemo(() => {
    const t = new Date();
    return `${t.getFullYear()}-${String(t.getMonth() + 1).padStart(2, '0')}-${String(t.getDate()).padStart(2, '0')}`;
  }, []);

  return (
    <div className="card overflow-hidden">
      {/* Header row: time gutter + 7 day columns */}
      <div className="grid grid-cols-[80px_repeat(7,1fr)] border-b border-gray-100 bg-gray-50/50">
        {/* Empty top-left corner */}
        <div className="border-r border-gray-100 px-2 py-3 text-center text-xs font-semibold text-muted">
          Horario
        </div>
        {weekColumns.map((col) => {
          const highlight = col.dateStr === todayDateStr;
          return (
            <div
              key={col.dateStr}
              className={`border-r border-gray-100 py-3 text-center text-sm font-semibold ${highlight ? 'bg-emerald-50 text-emerald-700' : 'text-secondary'}`}
            >
              {col.dayLabel}
            </div>
          );
        })}
      </div>

      {/* Time grid body */}
      <div className="relative">
        {/* Hour rows */}
        {HOURS.map((hour) => (
          <div
            key={hour}
            className="grid grid-cols-[80px_repeat(7,1fr)] border-b border-gray-100"
            style={{ height: `${cellHeight}px` }}
          >
            {/* Time label */}
            <div className="border-r border-gray-100 px-2 flex items-start pt-1">
              <span className="text-xs font-medium text-muted">{formatTime(hour)}</span>
            </div>
            {/* Day cells */}
            {weekColumns.map((col) => {
              const highlight = col.dateStr === todayDateStr;
              return (
                <div
                  key={col.dateStr}
                  className={`relative border-r border-gray-100 ${highlight ? 'bg-emerald-50/30' : ''}`}
                />
              );
            })}
          </div>
        ))}

        {/* Booking overlay — positioned absolute over the grid */}
        <div
          className="absolute inset-0 grid w-full"
          style={{ gridTemplateColumns: `80px repeat(7, 1fr)` }}
        >
          {/* Time gutter spacer */}
          <div />
          {weekColumns.map((col) => (
            <div key={col.dateStr} className="relative">
              {col.bookings.map((booking) => (
                <BookingCard
                  key={booking.id}
                  booking={booking}
                  cellHeight={cellHeight}
                />
              ))}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────

export default function SchedulePage() {
  const { currentVenue } = useVenue();
  const [viewMode, setViewMode] = useState<'calendar' | 'list'>('calendar');

  // Week anchored to Monday 13 May 2024 as per design
  const weekColumns = useMemo(() => {
    const baseStr = '2024-05-13';
    return buildWeekColumns(baseStr).map((col, i) => ({
      ...col,
      bookings: getBookingsForDay(MOCK_WEEK_BOOKINGS, i),
    }));
  }, []);

  const dateRange = '11 - 17 Mayo, 2024';

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between animate-fade-in">
        <div>
          <h1 className="page-heading">Reservas</h1>
          <p className="text-body mt-1">{currentVenue?.name ?? 'Sede'}</p>
        </div>

        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          {/* Date range pill */}
          <span className="badge bg-emerald-100 text-emerald-700 font-semibold">
            {dateRange}
          </span>

          {/* Tab filters */}
          <div className="inline-flex rounded-lg border border-gray-200 bg-white p-1 shadow-sm">
            <button
              onClick={() => setViewMode('calendar')}
              className={`rounded-md px-4 py-1.5 text-sm font-medium transition-colors ${
                viewMode === 'calendar'
                  ? 'bg-emerald-600 text-white shadow-sm'
                  : 'text-muted hover:text-secondary'
              }`}
            >
              Calendario
            </button>
            <button
              onClick={() => setViewMode('list')}
              className={`rounded-md px-4 py-1.5 text-sm font-medium transition-colors ${
                viewMode === 'list'
                  ? 'bg-emerald-600 text-white shadow-sm'
                  : 'text-muted hover:text-secondary'
              }`}
            >
              Lista
            </button>
          </div>

          {/* Nueva Reserva button */}
          <button className="btn btn-primary shrink-0">
            <svg className="mr-2 h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            Nueva Reserva
          </button>
        </div>
      </div>

      {/* Weekly Calendar */}
      {viewMode === 'calendar' && (
        <div className="animate-fade-in stagger-1 overflow-x-auto">
          <WeeklyCalendar weekColumns={weekColumns} cellHeight={60} />
        </div>
      )}

      {/* List view placeholder */}
      {viewMode === 'list' && (
        <div className="animate-fade-in stagger-1">
          <div className="card p-8">
            <div className="flex flex-col items-center justify-center py-8 text-center">
              <svg className="mb-3 h-12 w-12 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
              </svg>
              <p className="text-sm font-medium text-muted">Vista en lista — próxima implementación</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
