import { AppError } from '../../domain/errors/app_error.js';
import type { CourtPricingTier } from '../../domain/entities/booking/court.entity.js';
import type { CourtPricingTierRepository } from '../../domain/ports/court_pricing_tier_repository.js';
import type { ICourtRepository } from '../../domain/ports/court_repository.js';
import type { VenueStaffRepository } from '../../domain/ports/venue_staff_repository.js';

export type VenueCourtContext = {
  readonly venueId: string;
  readonly courtId: string;
  readonly actorUserId: string;
};

/**
 * @name    :assertVenueStaffAndCourtSV
 * @version :1.0.0
 * @description :Verifica que el actor sea staff de la sede y que la cancha
 * pertenezca a esa sede. Sin la segunda parte, el `:venueId` de la ruta seria
 * decorativo: un staff de la sede A podria editar una cancha de la sede B
 * poniendo su propio venueId en el path.
 * @param {VenueCourtContext} _ctx - Actor, sede y cancha
 * @param {VenueStaffRepository} _venueStaffRepository - Puerto de staff
 * @param {ICourtRepository} _courtRepository - Puerto de canchas
 * @return {Promise<void>}
 * @throws {AppError} 403 si no es staff, 404 si la cancha no existe, 400 si no
 * pertenece a la sede
 */
export async function assertVenueStaffAndCourtSV(
  _ctx: VenueCourtContext,
  _venueStaffRepository: VenueStaffRepository,
  _courtRepository: ICourtRepository,
): Promise<void> {
  const IS_STAFF = await _venueStaffRepository.isUserStaffOfVenueSV(_ctx.actorUserId, _ctx.venueId);
  if (!IS_STAFF) {
    throw new AppError('NO_AUTORIZADO', 'No tienes acceso a esta sede.', 403);
  }

  const COURT = await _courtRepository.findById(_ctx.courtId);
  if (COURT === null) {
    throw new AppError('CANCHA_NO_ENCONTRADA', 'La cancha indicada no existe.', 404);
  }
  if (COURT.venueId !== _ctx.venueId) {
    throw new AppError('CANCHA_NO_PERTENECE_A_SEDE', 'La cancha no pertenece a esta sede.', 400);
  }
}

/**
 * @name    :assertVenueStaffSV
 * @version :1.0.0
 * @description :Verifica que el actor sea staff de la sede, sin cancha de por
 * medio. Para escrituras a nivel de sede, como crear una cancha nueva.
 * @param {string} _actorUserId - Usuario que hace la request
 * @param {string} _venueId - Sede sobre la que opera
 * @param {VenueStaffRepository} _venueStaffRepository - Puerto de staff
 * @return {Promise<void>}
 * @throws {AppError} 403 si el actor no es staff de la sede
 */
export async function assertVenueStaffSV(
  _actorUserId: string,
  _venueId: string,
  _venueStaffRepository: VenueStaffRepository,
): Promise<void> {
  const IS_STAFF = await _venueStaffRepository.isUserStaffOfVenueSV(_actorUserId, _venueId);
  if (!IS_STAFF) {
    throw new AppError('NO_AUTORIZADO', 'No tienes acceso a esta sede.', 403);
  }
}

/**
 * @name    :assertTierBelongsToCourtSV
 * @version :1.0.0
 * @description :Devuelve la tarifa si existe y pertenece a la cancha. Mismo
 * razonamiento que `assertVenueStaffAndCourtSV`: sin la comprobacion de
 * pertenencia, el `:courtId` del path no restringe nada.
 * @param {string} _tierId - Tarifa buscada
 * @param {string} _courtId - Cancha a la que deberia pertenecer
 * @param {CourtPricingTierRepository} _pricingTierRepository - Puerto de tarifas
 * @return {Promise<CourtPricingTier>} La tarifa ya verificada
 * @throws {AppError} 404 si no existe, 400 si es de otra cancha
 */
export async function assertTierBelongsToCourtSV(
  _tierId: string,
  _courtId: string,
  _pricingTierRepository: CourtPricingTierRepository,
): Promise<CourtPricingTier> {
  const TIER = await _pricingTierRepository.findByIdSV(_tierId);
  if (TIER === null) {
    throw new AppError('TARIFA_NO_ENCONTRADA', 'La tarifa indicada no existe.', 404);
  }
  if (TIER.courtId !== _courtId) {
    throw new AppError(
      'TARIFA_NO_PERTENECE_A_CANCHA',
      'La tarifa no pertenece a esta cancha.',
      400,
    );
  }
  return TIER;
}
