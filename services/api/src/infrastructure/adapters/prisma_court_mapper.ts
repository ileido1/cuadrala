import type {
  Court as CourtModel,
  CourtPricingTier as CourtPricingTierModel,
} from '../../generated/prisma/client.js';
import type { Court, CourtPricingTier } from '../../domain/entities/booking/court.entity.js';
import { CourtStatus, SportType } from '../../domain/entities/booking/court.entity.js';

function prismaToCourtPricingTier(_model: CourtPricingTierModel): CourtPricingTier {
  return {
    id: _model.id,
    courtId: _model.courtId,
    label: _model.label,
    startTime: _model.startTime,
    endTime: _model.endTime,
    pricePerHourCents: _model.pricePerHourCents,
  };
}

export function prismaToCourtEntity(_model: CourtModel | null | undefined): Court | null {
  if (_model == null) return null;

  const SPORT_TYPE = _model.sportType === 'TENNIS' ? SportType.TENNIS : SportType.PADEL;
  const STATUS = _model.status === 'INACTIVE' ? CourtStatus.INACTIVE : CourtStatus.ACTIVE;

  const PRICING_TIERS =
    'pricingTiers' in _model && Array.isArray(_model.pricingTiers)
      ? _model.pricingTiers.map(prismaToCourtPricingTier)
      : [];

  return {
    id: _model.id,
    venueId: _model.venueId,
    name: _model.name,
    sportType: SPORT_TYPE,
    indoor: _model.indoor,
    lighting: _model.lighting,
    surfaceType: _model.surfaceType,
    status: STATUS,
    pricePerHourCents: _model.pricePerHourCents,
    capacity: _model.capacity,
    durationMinutes: _model.durationMinutes,
    createdAt: _model.createdAt,
    pricingTiers: PRICING_TIERS,
  };
}
