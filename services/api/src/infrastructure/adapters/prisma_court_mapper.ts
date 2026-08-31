/**
 * Mapeo de filas Prisma a entidades de dominio de canchas. Aísla al dominio
 * de la forma del modelo de datos.
 */
import type {
  Court as CourtModel,
  CourtPricingTier as CourtPricingTierModel,
} from '../../generated/prisma/client.js';
import type { Court, CourtPricingTier } from '../../domain/entities/booking/court.entity.js';
import type { CourtStatus, SportType } from '../../domain/entities/booking/court.entity.js';
import { courtStatusFromStringSV, sportTypeFromStringSV } from '../../domain/entities/booking/court.entity.js';
import { AppError } from '../../domain/errors/app_error.js';

/**
 * @name    :parseCourtEnumsSV
 * @version :1.0.0
 * @description :Traduce los enums de la fila de Prisma a los del dominio. Si un
 * valor no existe en el dominio es deriva nuestra, no del cliente: se reporta
 * 500 y no 400, y falla en vez de devolver una cancha del deporte o el estado
 * equivocados.
 * @param {{sportType: string, status: string}} _model - Fila de Prisma
 * @return {{sportType: SportType, status: CourtStatus}}
 * @throws {AppError} 500 si el enum de la base se adelantó al del dominio
 */
function parseCourtEnumsSV(_model: { sportType: string; status: string }): {
  sportType: SportType;
  status: CourtStatus;
} {
  try {
    return {
      sportType: sportTypeFromStringSV(_model.sportType),
      status: courtStatusFromStringSV(_model.status),
    };
  } catch {
    throw new AppError(
      'DATOS_CANCHA_INCONSISTENTES',
      'La cancha tiene un deporte o un estado que el dominio no reconoce.',
      500,
    );
  }
}

function prismaToCourtPricingTierSV(_model: CourtPricingTierModel): CourtPricingTier {
  return {
    id: _model.id,
    courtId: _model.courtId,
    label: _model.label,
    startTime: _model.startTime,
    endTime: _model.endTime,
    pricePerHourCents: _model.pricePerHourCents,
  };
}

/**
 * @name    :prismaToCourtEntitySV
 * @version :1.0.0
 * @description :Convierte una fila de `Court` de Prisma en la entidad de dominio.
 * @param {CourtModel | null | undefined} _model - Fila de Prisma
 * @return {Court | null} Entidad de dominio, o null si la fila no existe
 */
export function prismaToCourtEntitySV(_model: CourtModel | null | undefined): Court | null {
  if (_model == null) return null;

  const { sportType: SPORT_TYPE, status: STATUS } = parseCourtEnumsSV(_model);
  const PRICING_TIERS =
    'pricingTiers' in _model && Array.isArray(_model.pricingTiers)
      ? _model.pricingTiers.map(prismaToCourtPricingTierSV)
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
