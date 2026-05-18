import type { CourtPricingTier, ReservationListItem } from '~/types/api';

export const DEFAULT_VENUE_OPEN_MINUTES = 8 * 60;
export const DEFAULT_VENUE_CLOSE_MINUTES = 23 * 60;

export interface CourtBlockSlot {
  time: string;
  endTime: string;
  pricePerHourCents: number | null;
  tierLabel: string | null;
  isOccupied: boolean;
}

export function formatDurationLabel(_minutes: number): string {
  if (_minutes < 60) {
    return `${_minutes} min`;
  }
  const HOURS = Math.floor(_minutes / 60);
  const MINS = _minutes % 60;
  if (MINS === 0) {
    return HOURS === 1 ? '1 hora' : `${HOURS} horas`;
  }
  return `${HOURS} h ${MINS} min`;
}

export function minutesToTimeString(_minutes: number): string {
  const H = Math.floor(_minutes / 60);
  const M = _minutes % 60;
  return `${String(H).padStart(2, '0')}:${String(M).padStart(2, '0')}`;
}

function parseTimeToMinutes(_time: string): number {
  const [H, M] = _time.split(':').map(Number);
  return H * 60 + (M ?? 0);
}

/**
 * Comprueba solapamiento entre un bloque [slotStart, slotEnd) y reservas confirmadas.
 */
export function isCourtBlockOccupied(
  _slotStartMinutes: number,
  _blockDurationMinutes: number,
  _reservations: ReservationListItem[],
): boolean {
  const SLOT_END = _slotStartMinutes + _blockDurationMinutes;

  return _reservations.some((res) => {
    const RES_TIME =
      res.scheduledAt.split('T')[1]?.substring(0, 5) ?? res.scheduledAt;
    const RES_START = parseTimeToMinutes(RES_TIME);
    const RES_END = RES_START + res.durationMinutes;
    return _slotStartMinutes < RES_END && SLOT_END > RES_START;
  });
}

function resolveTierForStart(
  _startMinutes: number,
  _pricingTiers: CourtPricingTier[] | undefined,
): { pricePerHourCents: number | null; tierLabel: string | null } {
  if (!_pricingTiers?.length) {
    return { pricePerHourCents: null, tierLabel: null };
  }

  const TIER = _pricingTiers.find((t) => {
    const TIER_START = parseTimeToMinutes(t.startTime);
    const TIER_END = parseTimeToMinutes(t.endTime);
    return _startMinutes >= TIER_START && _startMinutes < TIER_END;
  });

  if (!TIER) {
    return { pricePerHourCents: null, tierLabel: null };
  }

  return {
    pricePerHourCents: TIER.pricePerHourCents,
    tierLabel: TIER.label,
  };
}

/**
 * Genera bloques consecutivos según durationMinutes de la cancha (sin huecos ni solapes).
 */
export function generateCourtBlockSlots(_options: {
  blockDurationMinutes: number;
  pricingTiers?: CourtPricingTier[];
  reservations?: ReservationListItem[];
  openMinutes?: number;
  closeMinutes?: number;
}): CourtBlockSlot[] {
  const {
    blockDurationMinutes,
    pricingTiers,
    reservations = [],
    openMinutes = DEFAULT_VENUE_OPEN_MINUTES,
    closeMinutes = DEFAULT_VENUE_CLOSE_MINUTES,
  } = _options;

  if (blockDurationMinutes <= 0) {
    return [];
  }

  const SLOTS: CourtBlockSlot[] = [];

  for (
    let start = openMinutes;
    start + blockDurationMinutes <= closeMinutes;
    start += blockDurationMinutes
  ) {
    const START_TIME = minutesToTimeString(start);
    const END_TIME = minutesToTimeString(start + blockDurationMinutes);
    const { pricePerHourCents, tierLabel } = resolveTierForStart(
      start,
      pricingTiers,
    );

    SLOTS.push({
      time: START_TIME,
      endTime: END_TIME,
      pricePerHourCents,
      tierLabel,
      isOccupied: isCourtBlockOccupied(
        start,
        blockDurationMinutes,
        reservations,
      ),
    });
  }

  return SLOTS;
}

/** Primer bloque disponible >= minStartMinutes (p. ej. hora actual si es hoy). */
export function findFirstSelectableBlockTime(
  _slots: CourtBlockSlot[],
  _minStartTime: string,
): string | null {
  const SLOT = _slots.find(
    (s) => !s.isOccupied && s.time >= _minStartTime,
  );
  return SLOT?.time ?? null;
}

export function getMinTimeForToday(
  _blockDurationMinutes: number,
  _openMinutes: number = DEFAULT_VENUE_OPEN_MINUTES,
  _closeMinutes: number = DEFAULT_VENUE_CLOSE_MINUTES,
): string {
  const NOW = new Date();
  const NOW_MINUTES = NOW.getHours() * 60 + NOW.getMinutes();
  const OPEN = _openMinutes;

  if (NOW_MINUTES <= OPEN) {
    return minutesToTimeString(OPEN);
  }

  const ELAPSED = NOW_MINUTES - OPEN;
  const BLOCKS_PASSED = Math.ceil(ELAPSED / _blockDurationMinutes);
  const NEXT_START = OPEN + BLOCKS_PASSED * _blockDurationMinutes;

  if (NEXT_START + _blockDurationMinutes > _closeMinutes) {
    return minutesToTimeString(_closeMinutes);
  }

  return minutesToTimeString(NEXT_START);
}
