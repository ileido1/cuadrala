import type { CourtPricingTier } from '../../entities/booking/court.entity.js';
import { AppError } from '../../errors/app_error.js';

type TierLike = Pick<
  CourtPricingTier,
  'startTime' | 'endTime' | 'pricePerHourCents'
>;

/** Valida que startTime < endTime en formato HH:MM. */
export function assertValidPricingTimeRangeSV(_startTime: string, _endTime: string): void {
  if (_startTime >= _endTime) {
    throw new AppError(
      'HORA_INVALIDA',
      'La hora de inicio debe ser menor que la hora de fin.',
      400,
    );
  }
}

/** Convierte "HH:MM" a minutos desde medianoche [0, 1440). */
export function parseTimeToMinutesSV(_time: string): number {
  const [H, M] = _time.split(':').map(Number);
  return H * 60 + (M ?? 0);
}

function findActiveTierSV(
  _minutesFromMidnight: number,
  _tiers: ReadonlyArray<TierLike>,
): TierLike | null {
  for (const TIER of _tiers) {
    const START = parseTimeToMinutesSV(TIER.startTime);
    const END = parseTimeToMinutesSV(TIER.endTime);
    if (_minutesFromMidnight >= START && _minutesFromMidnight < END) {
      return TIER;
    }
  }
  return null;
}

/**
 * Precio por hora para un instante del día (UTC, alineado con scheduledAt guardado).
 * Si no hay franja activa, usa el precio base de la cancha.
 */
export function resolvePricePerHourCentsAtMinutesSV(
  _minutesFromMidnight: number,
  _basePricePerHourCents: number | null,
  _tiers: ReadonlyArray<TierLike>,
): number | null {
  const ACTIVE = findActiveTierSV(_minutesFromMidnight, _tiers);
  if (ACTIVE !== null) {
    return ACTIVE.pricePerHourCents;
  }
  return _basePricePerHourCents;
}

/** Minutos del tramo actual hasta cambio de franja o fin del día. */
function minutesForPricingSegmentSV(
  _minutesFromMidnight: number,
  _remainingMinutes: number,
  _tiers: ReadonlyArray<TierLike>,
): number {
  const ACTIVE = findActiveTierSV(_minutesFromMidnight, _tiers);
  if (ACTIVE !== null) {
    const END = parseTimeToMinutesSV(ACTIVE.endTime);
    return Math.min(_remainingMinutes, END - _minutesFromMidnight);
  }

  let nextTierStart: number | null = null;
  for (const TIER of _tiers) {
    const START = parseTimeToMinutesSV(TIER.startTime);
    if (START > _minutesFromMidnight) {
      if (nextTierStart === null || START < nextTierStart) {
        nextTierStart = START;
      }
    }
  }

  if (nextTierStart !== null) {
    return Math.min(_remainingMinutes, nextTierStart - _minutesFromMidnight);
  }

  return Math.min(_remainingMinutes, 24 * 60 - _minutesFromMidnight);
}

/**
 * Calcula el total de la reserva aplicando franjas horarias (CourtPricingTier).
 * Reparte la duración en tramos cuando cruza límites de franja o huecos sin franja.
 */
export function calculateReservationTotalCentsSV(_input: {
  pricePerHourCents: number | null;
  pricingTiers: ReadonlyArray<TierLike>;
  scheduledAt: Date;
  durationMinutes: number;
}): number | null {
  const {
    pricePerHourCents,
    scheduledAt,
    durationMinutes,
  } = _input;
  const PRICING_TIERS = _input.pricingTiers ?? [];

  if (durationMinutes <= 0) {
    return null;
  }

  if (pricePerHourCents == null && PRICING_TIERS.length === 0) {
    return null;
  }

  let totalCents = 0;
  let remaining = durationMinutes;
  let cursorMs = scheduledAt.getTime();

  while (remaining > 0) {
    const CURSOR = new Date(cursorMs);
    const MINUTES_OF_DAY = CURSOR.getUTCHours() * 60 + CURSOR.getUTCMinutes();
    const RATE = resolvePricePerHourCentsAtMinutesSV(
      MINUTES_OF_DAY,
      pricePerHourCents,
      PRICING_TIERS,
    );

    if (RATE == null) {
      return null;
    }

    const SEGMENT_MINUTES = minutesForPricingSegmentSV(
      MINUTES_OF_DAY,
      remaining,
      PRICING_TIERS,
    );
    totalCents += Math.round((RATE * SEGMENT_MINUTES) / 60);
    remaining -= SEGMENT_MINUTES;
    cursorMs += SEGMENT_MINUTES * 60 * 1000;
  }

  return totalCents;
}
