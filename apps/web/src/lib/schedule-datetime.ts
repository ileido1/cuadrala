/**
 * Fecha/hora de reservas guardadas como ISO con Z (hora de pared en componentes UTC).
 * Ej.: 2026-05-19T09:30:00.000Z → día 2026-05-19, bloque 09:30–11:00.
 */

export function scheduledAtToCalendarDate(_iso: string): string {
  return _iso.slice(0, 10);
}

export function scheduledAtToWallClockParts(_iso: string): {
  hours: number;
  minutes: number;
} {
  const D = new Date(_iso);
  return { hours: D.getUTCHours(), minutes: D.getUTCMinutes() };
}

export function formatWallClockHHMM(_hours: number, _minutes: number): string {
  return `${String(_hours).padStart(2, '0')}:${String(_minutes).padStart(2, '0')}`;
}

export function wallClockRangeFromScheduledAt(
  _iso: string,
  _durationMinutes: number,
): { timeStart: string; timeEnd: string } {
  const { hours, minutes } = scheduledAtToWallClockParts(_iso);
  const TOTAL_END = hours * 60 + minutes + _durationMinutes;
  const END_H = Math.floor(TOTAL_END / 60);
  const END_M = TOTAL_END % 60;
  return {
    timeStart: formatWallClockHHMM(hours, minutes),
    timeEnd: formatWallClockHHMM(END_H, END_M),
  };
}

export function buildScheduledAtIso(_date: string, _timeHHMM: string): string {
  return `${_date}T${_timeHHMM}:00.000Z`;
}

/** Fecha y hora para UI (misma convención que al crear la reserva). */
export function formatScheduledAtForDisplay(_iso: string): {
  dateStr: string;
  timeStr: string;
} {
  const CALENDAR_DATE = scheduledAtToCalendarDate(_iso);
  const [Y, M, D] = CALENDAR_DATE.split('-').map(Number);
  const DATE_FOR_LABEL = new Date(Y, M - 1, D);
  const { hours, minutes } = scheduledAtToWallClockParts(_iso);
  const TIME_ANCHOR = new Date(Date.UTC(2000, 0, 1, hours, minutes));

  return {
    dateStr: DATE_FOR_LABEL.toLocaleDateString('es-AR', {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    }),
    timeStr: TIME_ANCHOR.toLocaleTimeString('es-AR', {
      hour: '2-digit',
      minute: '2-digit',
      timeZone: 'UTC',
    }),
  };
}
