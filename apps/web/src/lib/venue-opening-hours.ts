export type OpeningHoursMap = Record<string, { open: string; close: string }>;

const DEFAULT_OPEN_MINUTES = 8 * 60;
const DEFAULT_CLOSE_MINUTES = 23 * 60;

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
  sunday: 'Domingo',
  monday: 'Lunes',
  tuesday: 'Martes',
  wednesday: 'Miércoles',
  thursday: 'Jueves',
  friday: 'Viernes',
  saturday: 'Sábado',
};

function parseTimeToMinutes(_time: string): number {
  const [H, M] = _time.split(':').map(Number);
  return H * 60 + (M ?? 0);
}

export function minutesToTimeString(_minutes: number): string {
  const H = Math.floor(_minutes / 60);
  const M = _minutes % 60;
  return `${String(H).padStart(2, '0')}:${String(M).padStart(2, '0')}`;
}

export function dayKeyFromIsoDate(_isoDate: string): VenueDayKey {
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

export function getDayHoursForDate(
  _isoDate: string,
  _openingHours: OpeningHoursMap | null | undefined,
): { openMinutes: number; closeMinutes: number } | null {
  const DAY_KEY = dayKeyFromIsoDate(_isoDate);

  if (_openingHours == null) {
    if (DAY_KEY === 'sunday') {
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

  const ENTRY = _openingHours[DAY_KEY];
  if (!ENTRY) {
    return null;
  }

  const OPEN = parseTimeToMinutes(ENTRY.open);
  const CLOSE = parseTimeToMinutes(ENTRY.close);
  if (CLOSE <= OPEN) {
    return null;
  }

  return { openMinutes: OPEN, closeMinutes: CLOSE };
}

export function isVenueOpenOnDate(
  _isoDate: string,
  _openingHours: OpeningHoursMap | null | undefined,
): boolean {
  return getDayHoursForDate(_isoDate, _openingHours) !== null;
}

export function closedDayMessage(
  _isoDate: string,
  _openingHours: OpeningHoursMap | null | undefined,
): string {
  const DAY_KEY = dayKeyFromIsoDate(_isoDate);
  return `${DAY_LABELS_ES[DAY_KEY]} la sede está cerrada. Elegí otro día.`;
}

export function hoursRangeLabel(
  _openMinutes: number,
  _closeMinutes: number,
): string {
  return `${minutesToTimeString(_openMinutes)} – ${minutesToTimeString(_closeMinutes)}`;
}

export function validateTimeWithinDayHours(
  _time: string,
  _durationMinutes: number,
  _openMinutes: number,
  _closeMinutes: number,
): string | null {
  const START = parseTimeToMinutes(_time);
  const END = START + _durationMinutes;
  if (START < _openMinutes) {
    return `La hora de inicio no puede ser antes de ${minutesToTimeString(_openMinutes)}.`;
  }
  if (END > _closeMinutes) {
    return `El bloque termina después del cierre (${minutesToTimeString(_closeMinutes)}).`;
  }
  return null;
}
