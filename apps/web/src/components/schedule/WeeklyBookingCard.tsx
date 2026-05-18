'use client';

type BookingKind = 'match' | 'direct' | 'blocked';
type BookingStatus = 'confirmed' | 'cancelled';

export interface WeeklyBookingCardModel {
  id: string;
  playerName: string;
  timeStart: string;
  timeEnd: string;
  status: BookingStatus;
  courtName?: string;
  kind: BookingKind;
  paymentStatus?: 'UNPAID' | 'PARTIAL' | 'PAID';
  layoutColumn: number;
  layoutColumnCount: number;
}

interface WeeklyBookingCardProps {
  booking: WeeklyBookingCardModel;
  cellHeight: number;
  onClick: () => void;
}

function getKindColor(_kind: BookingKind, _status: BookingStatus): string {
  if (_status === 'cancelled') {
    return 'bg-red-400/90 border-red-500';
  }
  return {
    match: 'bg-blue-500/95 border-blue-600',
    direct: 'bg-emerald-500/95 border-emerald-600',
    blocked: 'bg-red-500/95 border-red-600',
  }[_kind];
}

function getKindLabel(_kind: BookingKind): string {
  switch (_kind) {
    case 'match':
      return 'Partido';
    case 'direct':
      return 'Reserva';
    case 'blocked':
      return 'Bloqueado';
  }
}

function paymentBadge(
  _status: 'UNPAID' | 'PARTIAL' | 'PAID',
  _compact: boolean,
): string {
  if (_status === 'PAID') {
    return _compact ? '✓' : 'Pagado';
  }
  if (_status === 'PARTIAL') {
    return _compact ? '~' : 'Parcial';
  }
  return _compact ? '·' : 'Sin pagar';
}

export function WeeklyBookingCard({
  booking,
  cellHeight,
  onClick,
}: WeeklyBookingCardProps) {
  const [H, M] = booking.timeStart.split(':').map(Number);
  const [EH, EM] = booking.timeEnd.split(':').map(Number);
  const DURATION_H = (EH - H) + (EM - M) / 60;
  const HEIGHT = Math.max(DURATION_H * cellHeight - 4, 28);
  const TOP = ((H - 8) + M / 60) * cellHeight;

  const COLUMN_COUNT = booking.layoutColumnCount;
  const COLUMN = booking.layoutColumn;
  const WIDTH_PCT = 100 / COLUMN_COUNT;
  const LEFT_PCT = COLUMN * WIDTH_PCT;
  const GAP = COLUMN_COUNT > 1 ? 3 : 0;
  const COMPACT = COLUMN_COUNT > 1;
  const NARROW = COLUMN_COUNT > 2;

  return (
    <button
      type="button"
      onClick={onClick}
      title={[
        booking.courtName,
        booking.playerName,
        `${booking.timeStart} – ${booking.timeEnd}`,
      ]
        .filter(Boolean)
        .join(' · ')}
      className={`
        absolute z-10 overflow-hidden rounded-md border px-1.5 py-1
        text-left text-white shadow-sm transition-all
        hover:z-20 hover:shadow-md hover:ring-2 hover:ring-white/40
        ${getKindColor(booking.kind, booking.status)}
      `}
      style={{
        top: `${TOP}px`,
        height: `${HEIGHT}px`,
        left: `calc(${LEFT_PCT}% + ${GAP}px)`,
        width: `calc(${WIDTH_PCT}% - ${GAP * 2}px)`,
        minWidth: COMPACT ? '2.5rem' : undefined,
      }}
    >
      {booking.courtName && (
        <span
          className={`block font-semibold leading-tight truncate ${
            NARROW ? 'text-[9px]' : 'text-[10px]'
          } opacity-90`}
        >
          {booking.courtName}
        </span>
      )}
      <span
        className={`block font-medium leading-tight truncate ${
          NARROW ? 'text-[9px]' : 'text-[11px]'
        }`}
      >
        {booking.playerName}
      </span>
      {!NARROW && (
        <span className="flex items-center justify-between gap-1 mt-0.5 text-[9px] opacity-85">
          <span className="truncate">{getKindLabel(booking.kind)}</span>
          {booking.paymentStatus && (
            <span
              className={`shrink-0 rounded px-1 py-px font-medium ${
                booking.paymentStatus === 'PAID'
                  ? 'bg-white/25'
                  : booking.paymentStatus === 'PARTIAL'
                    ? 'bg-yellow-300/90 text-yellow-900'
                    : 'bg-black/25'
              }`}
            >
              {paymentBadge(booking.paymentStatus, COMPACT)}
            </span>
          )}
        </span>
      )}
    </button>
  );
}
