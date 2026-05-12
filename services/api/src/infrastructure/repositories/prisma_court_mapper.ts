/**
 * Mapeador entity↔Prisma para Court.
 * Convierte el CourtModel de Prisma (generado) al tipo Court de dominio (puro).
 *
 * US-W1-05 — CRUD Courts — PR2
 */

import type { Court as CourtModel, CourtPricingTier as CourtPricingTierModel } from '../../generated/prisma/client.js';
import type { Court, CourtPricingTier } from '../../domain/entities/court.entity.js';
import { CourtStatus, SportType } from '../../domain/entities/court.entity.js';

/**
 * Convierte un CourtPricingTierModel de Prisma a CourtPricingTier de dominio.
 */
function prismaToCourtPricingTier(model: CourtPricingTierModel): CourtPricingTier {
  return {
    id: model.id,
    courtId: model.courtId,
    label: model.label,
    startTime: model.startTime,
    endTime: model.endTime,
    pricePerHourCents: model.pricePerHourCents,
  };
}

/**
 * Convierte un registro de Prisma (CourtModel) a la entidad de dominio Court.
 * Retorna null si el modelo es null.
 * Incluye pricingTiers si vienen incluidos en la query de Prisma.
 */
export function prismaToCourtEntity(model: CourtModel | null | undefined): Court | null {
  if (model == null) return null;

  // Mapeo directo de campos escalares
  const sportType = model.sportType === 'TENNIS' ? SportType.TENNIS : SportType.PADEL;
  const status = model.status === 'INACTIVE' ? CourtStatus.INACTIVE : CourtStatus.ACTIVE;

  // Mapear pricingTiers si vienen incluidos (lazy load)
  const pricingTiers = 'pricingTiers' in model && Array.isArray(model.pricingTiers)
    ? model.pricingTiers.map(prismaToCourtPricingTier)
    : [];

  return {
    id: model.id,
    venueId: model.venueId,
    name: model.name,
    sportType,
    indoor: model.indoor,
    lighting: model.lighting,
    surfaceType: model.surfaceType,
    status,
    pricePerHourCents: model.pricePerHourCents,
    capacity: model.capacity,
    durationMinutes: model.durationMinutes,
    createdAt: model.createdAt,
    pricingTiers,
  };
}
