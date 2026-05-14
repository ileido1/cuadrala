'use client';

import { useEffect, useState, useMemo } from 'react';
import { useVenue } from '~/contexts/venue-context';
import { apiClient } from '~/lib/api-client';
import type { BookingItem, Court } from '~/types/api';
import { ReservationModal } from '~/components/schedule/ReservationModal';
import { BlockSlotModal } from '~/components/schedule/BlockSlotModal';
import { ReservationDetailModal } from '~/components/schedule/ReservationDetailModal';
import { DayPicker } from '~/components/schedule/DayPicker';

// ─── Types ───────────────────────────────────────────────────────────────────

type BookingStatus = 'confirmed' | 'cancelled';
type BookingKind = 'match' | 'direct' | 'blocked';

interface Booking {
  id: string;
  playerName: string;
  timeStart: string; // "HH:MM"
  timeEnd: string;   // "HH:MM"
  status: BookingStatus;
  courtName?: string;
  kind: BookingKind;
  matchStatus?: 'SCHEDULED' | 'IN_PROGRESS' | 'FINISHED' | 'CANCELLED';
  paymentStatus?: 'UNPAID' | 'PARTIAL' | 'PAID';
  // Original booking item reference
  _booking?: BookingItem;
}

interface DayColumn {
  date: Date;
  dateStr: string;       // "2024-05-11"
  dayLabel: string;      // "Lun 11"
  bookings: Booking[];
}

// ─── Helpers ───────────────────────────────────────────────────────────────

// Dynamic hours based on max duration (up to 23:00)
function buildHourLabels(maxDurationMinutes: number = 60): string[] {
  const hours: string[] = [];
  for (let h = 8; h < 24; h++) {
    hours.push(`${String(h).padStart(2, '0')}:00`);
  }
  return hours;
}

const DAY_NAMES_SHORT = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];
const MONTH_NAMES = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];

function isToday(date: Date): boolean {
  const today = new Date();
  return (
    date.getDate() === today.getDate() &&
    date.getMonth() === today.getMonth() &&
    date.getFullYear() === today.getFullYear()
  );
}

function buildWeekColumns(baseDateStr: string): DayColumn[] {
  const [y, m, d] = baseDateStr.split('-').map(Number);
  const monday = new Date(y, m - 1, d);
  const dayOfWeek = monday.getDay();
  const mondayOffset = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
  monday.setDate(monday.getDate() + mondayOffset);

  return Array.from({ length: 7 }, (_, i) => {
    const date = new Date(monday);
    date.setDate(monday.getDate() + i);
    const dateStr = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
    const dayIdx = date.getDay();
    const dayLabel = `${DAY_NAMES_SHORT[dayIdx]} ${String(date.getDate()).padStart(2, '0')}`;
    return { date, dateStr, dayLabel, bookings: [] };
  });
}

function getKindColor(kind: BookingKind, status: BookingStatus): string {
  if (status === 'cancelled') return 'bg-red-400';
  return {
    match:   'bg-blue-500',
    direct:  'bg-emerald-500',
    blocked: 'bg-red-500',
  }[kind];
}

function getKindLabel(kind: BookingKind): string {
  switch (kind) {
    case 'match':   return 'Partido';
    case 'direct':  return 'Reserva';
    case 'blocked': return 'Bloqueado';
  }
}

// ─── Components ────────────────────────────────────────────────────────────

interface BookingCardProps {
  booking: Booking;
  cellHeight: number;
  onClick: () => void;
}

function BookingCard({ booking, cellHeight, onClick }: BookingCardProps) {
  const [h, m] = booking.timeStart.split(':').map(Number);
  const startHour = h;
  const durationH = () => {
    const [eh, em] = booking.timeEnd.split(':').map(Number);
    return (eh - h) + (em - m) / 60;
  };
  const heightPct = (durationH() / 1) * cellHeight;
  const topOffset = ((startHour - 8) / 1) * cellHeight;

  // Badge: payment status for non-cancelled reservations
  const badge = booking.paymentStatus ? (
    <span className={`ml-1 inline-flex items-center rounded-full px-1.5 py-0.5 text-[9px] font-medium ${
      booking.paymentStatus === 'PAID' ? 'bg-green-400 text-green-900' :
      booking.paymentStatus === 'PARTIAL' ? 'bg-yellow-100 text-yellow-700 border border-yellow-300' :
      'bg-gray-800/80 text-white'
    }`}>
      {booking.paymentStatus === 'PAID' ? 'Pagado' :
       booking.paymentStatus === 'PARTIAL' ? `Parcial` : 'Sin pagar'}
    </span>
  ) : null;

  return (
    <button
      onClick={onClick}
      className={`absolute left-0 right-0 rounded-md px-2 flex flex-col justify-center text-xs font-medium text-white shadow-sm transition-opacity hover:opacity-80 ${getKindColor(booking.kind, booking.status)}`}
      style={{
        top: `${topOffset}px`,
        height: `${Math.max(heightPct - 4, 20)}px`,
        minHeight: '20px',
      }}
    >
      <span className="block truncate text-center leading-tight">
        {booking.playerName}
        {badge && <>{' '}{badge}</>}
      </span>
      <span className="block text-[10px] opacity-75 text-center">{getKindLabel(booking.kind)}</span>
    </button>
  );
}

interface WeeklyCalendarProps {
  weekColumns: DayColumn[];
  cellHeight: number;
  onSlotClick: (booking: Booking) => void;
  hourLabels: string[];
}

function WeeklyCalendar({ weekColumns, cellHeight, onSlotClick, hourLabels }: WeeklyCalendarProps) {
  const todayDateStr = useMemo(() => {
    const t = new Date();
    return `${t.getFullYear()}-${String(t.getMonth() + 1).padStart(2, '0')}-${String(t.getDate()).padStart(2, '0')}`;
  }, []);

  return (
    <div className="card overflow-hidden">
      {/* Header row: time gutter + 7 day columns */}
      <div className="grid grid-cols-[80px_repeat(7,1fr)] border-b border-gray-100 bg-gray-50/50">
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
        {hourLabels.map((hourLabel) => (
          <div
            key={hourLabel}
            className="grid grid-cols-[80px_repeat(7,1fr)] border-b border-gray-100"
            style={{ height: `${cellHeight}px` }}
          >
            <div className="border-r border-gray-100 px-2 flex items-start pt-1">
              <span className="text-xs font-medium text-muted">{hourLabel}</span>
            </div>
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

        {/* Booking overlay */}
        <div
          className="absolute inset-0 grid w-full"
          style={{ gridTemplateColumns: `80px repeat(7, 1fr)` }}
        >
          <div />
          {weekColumns.map((col) => (
            <div key={col.dateStr} className="relative">
              {col.bookings.map((booking) => (
                <BookingCard
                  key={booking.id}
                  booking={booking}
                  cellHeight={cellHeight}
                  onClick={() => onSlotClick(booking)}
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
  const [bookings, setBookings] = useState<BookingItem[]>([]);
  const [courts, setCourts] = useState<Court[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  // Modal state
  const [showReservationModal, setShowReservationModal] = useState(false);
  const [showBlockModal, setShowBlockModal] = useState(false);
  const [selectedBooking, setSelectedBooking] = useState<Booking | null>(null);
  const [selectedDate, setSelectedDate] = useState(() => new Date().toISOString().split('T')[0]);

  // Compute week range from selectedDate (monday to sunday)
  const { weekFrom, weekTo } = useMemo(() => {
    const [y, m, d] = selectedDate.split('-').map(Number);
    const date = new Date(y, m - 1, d);
    const dayOfWeek = date.getDay();
    const mondayOffset = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
    const monday = new Date(date);
    monday.setDate(date.getDate() + mondayOffset);
    const sunday = new Date(monday);
    sunday.setDate(monday.getDate() + 6);
    const fmt = (dt: Date) => `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, '0')}-${String(dt.getDate()).padStart(2, '0')}`;
    return { weekFrom: fmt(monday), weekTo: fmt(sunday) };
  }, [selectedDate]);

  // Compute max duration from courts for dynamic hour labels
  const maxDurationMinutes = useMemo(() => {
    return courts.length > 0
      ? Math.max(...courts.map((c) => c.durationMinutes ?? 60))
      : 60;
  }, [courts]);

  const hourLabels = useMemo(() => buildHourLabels(maxDurationMinutes), [maxDurationMinutes]);

  // Fetch unified bookings + courts
  useEffect(() => {
    if (!currentVenue) return;

    Promise.all([
      apiClient.venues.bookings.list(currentVenue.id, { from: weekFrom, to: weekTo }),
      apiClient.venues.courts.list(currentVenue.id, { status: 'ACTIVE' }),
    ])
      .then(([bookingsRes, courtsRes]) => {
        const bookingsData = bookingsRes.data.data as { items: BookingItem[] };
        const courtsData = (courtsRes.data.data as { items: Court[] }).items ?? [];
        console.debug('[Schedule] bookings response:', bookingsRes.data);
        console.debug('[Schedule] courts response:', courtsRes.data);
        setBookings(bookingsData.items);
        setCourts(courtsData);
      })
      .catch((err) => {
        console.error('[Schedule] fetch error:', err);
        setError(true);
      })
      .finally(() => setLoading(false));
  }, [currentVenue, weekFrom, weekTo]);

  // Build week columns from unified bookings
  const weekColumns = useMemo(() => {
    const columns = buildWeekColumns(weekFrom);

    return columns.map((col) => {
      const dayBookings = bookings.filter((booking) => {
        if (!booking.scheduledAt) return false;
        const bookingDate = new Date(booking.scheduledAt).toISOString().split('T')[0];
        return bookingDate === col.dateStr;
      });

      const bookingsAsCalendar: Booking[] = dayBookings.map((booking): Booking => {
        const scheduledDate = new Date(booking.scheduledAt);
        const hours = scheduledDate.getHours();
        const minutes = scheduledDate.getMinutes();
        const startHour = String(hours).padStart(2, '0');
        const startMin = String(minutes).padStart(2, '0');
        const totalMins = minutes + (booking.durationMinutes ?? 60);
        const endMin = totalMins % 60;
        const endHour = String(hours + Math.floor(totalMins / 60)).padStart(2, '0');

        const status: BookingStatus =
          booking.status === 'CONFIRMED' ? 'confirmed' : 'cancelled';

        const playerName =
          booking.type === 'MATCH'
            ? `Match ${booking.participantCount ?? 0}/${booking.maxParticipants ?? 4}`
            : booking.type === 'BLOCKED'
              ? 'Bloqueado'
              : booking.courtName ?? booking.notes ?? 'Reserva';

        return {
          id: booking.id,
          playerName,
          timeStart: `${startHour}:${startMin}`,
          timeEnd: `${endHour}:${String(endMin).padStart(2, '0')}`,
          status,
          courtName: booking.courtName ?? undefined,
          kind:
            booking.type === 'MATCH' ? 'match' : booking.type === 'BLOCKED' ? 'blocked' : 'direct',
          matchStatus: booking.matchStatus ?? undefined,
          paymentStatus: booking.paymentStatus,
          _booking: booking,
        };
      });

      return { ...col, bookings: bookingsAsCalendar };
    });
  }, [bookings, weekFrom]);

  const handleSlotClick = (booking: Booking) => {
    setSelectedBooking(booking);
  };

  const handleModalClose = () => {
    setShowReservationModal(false);
    setShowBlockModal(false);
    setSelectedBooking(null);
  };

  const handleSuccess = async () => {
    if (!currentVenue) return;
    try {
      const bookingsRes = await apiClient.venues.bookings.list(currentVenue.id, {
        from: weekFrom,
        to: weekTo,
      });
      const bookingsData = bookingsRes.data.data as { items: BookingItem[] };
      setBookings(bookingsData.items);
    } catch { /* silently fail on refresh */ }
  };

  const dateRange = `${weekFrom.split('-').slice(1).join('/')} - ${weekTo.split('-').slice(1).join('/')}`;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between animate-fade-in">
        <div>
          <h1 className="page-heading">Reservas</h1>
          <p className="text-body mt-1">{currentVenue?.name ?? 'Sede'}</p>
        </div>

        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          {/* Date navigation */}
          <button
            onClick={() => {
              const [y, m, d] = selectedDate.split('-').map(Number);
              const date = new Date(y, m - 1, d);
              date.setDate(date.getDate() - 7);
              setSelectedDate(date.toISOString().split('T')[0]);
            }}
            className="btn btn-ghost px-2"
          >
            ←
          </button>
          <DayPicker value={selectedDate} onChange={setSelectedDate} />
          <button
            onClick={() => {
              const [y, m, d] = selectedDate.split('-').map(Number);
              const date = new Date(y, m - 1, d);
              date.setDate(date.getDate() + 7);
              setSelectedDate(date.toISOString().split('T')[0]);
            }}
            className="btn btn-ghost px-2"
          >
            →
          </button>

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
          <button
            onClick={() => setShowReservationModal(true)}
            className="btn btn-primary shrink-0"
          >
            <svg className="mr-2 h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            Nueva Reserva
          </button>

          {/* Bloquear horario button */}
          <button
            onClick={() => setShowBlockModal(true)}
            className="btn btn-error shrink-0"
          >
            <svg className="mr-2 h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" />
            </svg>
            Bloquear
          </button>
        </div>
      </div>

      {/* Legend */}
      <div className="flex flex-wrap items-center gap-4 text-xs">
        <div className="flex items-center gap-1.5">
          <span className="h-3 w-3 rounded bg-blue-500" />
          <span className="text-muted">Partido</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="h-3 w-3 rounded bg-emerald-500" />
          <span className="text-muted">Reserva Directa</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="h-3 w-3 rounded bg-red-500" />
          <span className="text-muted">Bloqueado</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="h-3 w-3 rounded bg-red-400" />
          <span className="text-muted">Cancelada</span>
        </div>
      </div>

      {/* Loading/Error state */}
      {loading && (
        <div className="card p-8 flex items-center justify-center">
          <div className="animate-spin h-8 w-8 border-4 border-primary-600 border-t-transparent rounded-full" />
        </div>
      )}

      {error && !loading && (
        <div className="card p-8 text-center">
          <p className="text-red-600">No se pudieron cargar las reservas. Intenta de nuevo.</p>
        </div>
      )}

      {/* Weekly Calendar */}
      {!loading && !error && viewMode === 'calendar' && (
        <div className="animate-fade-in stagger-1 overflow-x-auto">
          <WeeklyCalendar weekColumns={weekColumns} cellHeight={60} onSlotClick={handleSlotClick} hourLabels={hourLabels} />
        </div>
      )}

      {/* List view placeholder */}
      {viewMode === 'list' && !loading && (
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

      {/* Modals */}
      {showReservationModal && courts.length > 0 && currentVenue && (
        <ReservationModal
          venueId={currentVenue.id}
          courts={courts}
          defaultDate={weekFrom}
          onClose={() => setShowReservationModal(false)}
          onSuccess={handleSuccess}
        />
      )}

      {showBlockModal && courts.length > 0 && currentVenue && (
        <BlockSlotModal
          venueId={currentVenue.id}
          courts={courts}
          defaultDate={weekFrom}
          onClose={() => setShowBlockModal(false)}
          onSuccess={handleSuccess}
        />
      )}

      {selectedBooking?._booking && currentVenue && (
        <ReservationDetailModal
          reservation={selectedBooking._booking}
          venueId={currentVenue.id}
          onClose={() => setSelectedBooking(null)}
          onCancel={handleSuccess}
        />
      )}
    </div>
  );
}