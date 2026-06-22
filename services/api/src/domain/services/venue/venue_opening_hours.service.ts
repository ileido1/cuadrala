import { AppError } from '../../errors/app_error.js';

export type OpeningHoursMap = Record<string, { open: string; close: string }>;

const DAY_KEYS = [
  'sunday',
  'monday',
  'tuesday',
  'wednesday',
  'thursday',
  'friday',
  'saturday',
] as const;

export type VenueDayKey = (typeof DAY_KEYS)[number];

const DAY_LABELS_ES: Record<VenueDayKey, string> = {
  sunday: 'el domingo',
  monday: 'el lunes',
  tuesday: 'el martes',
  wednesday: 'el miércoles',
  thursday: 'el jueves',
  friday: 'el viernes',
  saturday: 'el sábado',
};

const DEFAULT_OPEN_MINUTES = 8 * 60;
const DEFAULT_CLOSE_MINUTES = 23 * 60;

export function parseTimeToMinutesSV(_time: string): number {
  const [H, M] = _time.split(':').map(Number);
  if (!Number.isFinite(H) || !Number.isFinite(M)) {
    return 0;
  }
  return H * 60 + M;
}

export function minutesToTimeStringSV(_minutes: number): string {
  const H = Math.floor(_minutes / 60);
  const M = _minutes % 60;
  return `${String(H).padStart(2, '0')}:${String(M).padStart(2, '0')}`;
}

/** Día de la semana según componentes UTC del instante (alineado con agenda web). */
export function dayKeyFromDateSV(_date: Date): VenueDayKey {
  return DAY_KEYS[_date.getUTCDay()] ?? 'monday';
}

export function dayKeyFromIsoDateSV(_isoDate: string): VenueDayKey {
  const [Y, M, D] = _isoDate.split('-').map(Number);
  const LOCAL = new Date(Y, M - 1, D);
  const MAP: VenueDayKey[] = [
    'sunday',
    'monday',
    'tuesday',
    'wednesday',
    'thursday',
    'friday',
    'saturday',
  ];
  return MAP[LOCAL.getDay()] ?? 'monday';
}

export function getDayHoursSV(
  _openingHours: OpeningHoursMap | null | undefined,
  _dayKey: VenueDayKey,
): { openMinutes: number; closeMinutes: number } | null {
  if (_openingHours == null) {
    if (_dayKey === 'sunday') {
      return null;
    }
    return {
      openMinutes: DEFAULT_OPEN_MINUTES,
      closeMinutes: DEFAULT_CLOSE_MINUTES,
    };
  }

  if (typeof _openingHours !== 'object' || Object.keys(_openingHours).length === 0) {
    return null;
  }

  const ENTRY = _openingHours[_dayKey];
  if (!ENTRY || typeof ENTRY !== 'object') {
    return null;
  }

  const OPEN = parseTimeToMinutesSV(ENTRY.open);
  const CLOSE = parseTimeToMinutesSV(ENTRY.close);
  if (CLOSE <= OPEN) {
    return null;
  }

  return { openMinutes: OPEN, closeMinutes: CLOSE };
}

export function getWallClockMinutesFromDateSV(_date: Date): number {
  return _date.getUTCHours() * 60 + _date.getUTCMinutes();
}

/**
 * Predicado puro y no-lanzante: indica si la franja [scheduledAt, +duration]
 * cae dentro del horario de atención de la sede para ese día.
 *
 * Devuelve true cuando duration <= 0 (espeja el early-return del assert) o
 * cuando START >= open && END <= close (límites inclusivos). Devuelve false
 * cuando el día está cerrado (getDayHoursSV === null) o la franja se sale.
 */
export function isWithinOpeningHoursSV(
  _scheduledAt: Date,
  _durationMinutes: number,
  _openingHours: OpeningHoursMap | null | undefined,
): boolean {
  if (_durationMinutes <= 0) {
    return true;
  }

  const DAY_KEY = dayKeyFromDateSV(_scheduledAt);
  const HOURS = getDayHoursSV(_openingHours, DAY_KEY);
  if (HOURS === null) {
    return false;
  }

  const START = getWallClockMinutesFromDateSV(_scheduledAt);
  const END = START + _durationMinutes;
  return START >= HOURS.openMinutes && END <= HOURS.closeMinutes;
}

export function assertReservationWithinOpeningHoursSV(
  _scheduledAt: Date,
  _durationMinutes: number,
  _openingHours: OpeningHoursMap | null | undefined,
): void {
  if (isWithinOpeningHoursSV(_scheduledAt, _durationMinutes, _openingHours)) {
    return;
  }

  // Camino de fallo: recomputar el horario del día para emitir el error correcto.
  const DAY_KEY = dayKeyFromDateSV(_scheduledAt);
  const HOURS = getDayHoursSV(_openingHours, DAY_KEY);

  if (HOURS === null) {
    throw new AppError(
      'HORARIO_CERRADO',
      `La sede no atiende ${DAY_LABELS_ES[DAY_KEY]}.`,
      422,
    );
  }

  throw new AppError(
    'FUERA_DE_HORARIO',
    `El horario debe estar entre ${minutesToTimeStringSV(HOURS.openMinutes)} y ${minutesToTimeStringSV(HOURS.closeMinutes)}.`,
    422,
  );
}
