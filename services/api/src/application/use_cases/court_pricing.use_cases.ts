import type { CourtPricingTier } from '../../domain/entities/booking/court.entity.js';
import type { ICourtRepository } from '../../domain/ports/court_repository.js';
import type { CourtPricingTierRepository } from '../../domain/ports/court_pricing_tier_repository.js';
import type { VenueStaffRepository } from '../../domain/ports/venue_staff_repository.js';
import { assertValidPricingTimeRangeSV } from '../../domain/services/booking/pricing.service.js';
import type { VenueCourtContext } from '../helpers/assert_venue_court_access.js';
import {
  assertTierBelongsToCourtSV,
  assertVenueStaffAndCourtSV,
} from '../helpers/assert_venue_court_access.js';

export class ListCourtPricingTiersUseCase {
  constructor(
    private readonly _pricingTierRepository: CourtPricingTierRepository,
    private readonly _courtRepository: ICourtRepository,
    private readonly _venueStaffRepository: VenueStaffRepository,
  ) {}

  /**
   * @name    :executeSV
   * @version :1.0.0
   * @description :Lista las tarifas de una cancha. Solo staff de la sede.
   * @param {VenueCourtContext} _ctx - Actor, sede y cancha
   * @return {Promise<{items: CourtPricingTier[]}>}
   */
  async executeSV(_ctx: VenueCourtContext): Promise<{ items: CourtPricingTier[] }> {
    await assertVenueStaffAndCourtSV(_ctx, this._venueStaffRepository, this._courtRepository);
    const ITEMS = await this._pricingTierRepository.listByCourtIdSV(_ctx.courtId);
    return { items: ITEMS };
  }
}

export class CreateCourtPricingTierUseCase {
  constructor(
    private readonly _pricingTierRepository: CourtPricingTierRepository,
    private readonly _courtRepository: ICourtRepository,
    private readonly _venueStaffRepository: VenueStaffRepository,
  ) {}

  /**
   * @name    :executeSV
   * @version :1.0.0
   * @description :Crea una franja horaria con precio para una cancha.
   * @param {VenueCourtContext} _ctx - Actor, sede y cancha
   * @param {Object} _input - Etiqueta, rango horario y precio por hora
   * @return {Promise<CourtPricingTier>}
   */
  async executeSV(
    _ctx: VenueCourtContext,
    _input: {
      label: string;
      startTime: string;
      endTime: string;
      pricePerHourCents: number;
    },
  ): Promise<CourtPricingTier> {
    await assertVenueStaffAndCourtSV(_ctx, this._venueStaffRepository, this._courtRepository);
    assertValidPricingTimeRangeSV(_input.startTime, _input.endTime);

    return this._pricingTierRepository.createSV({
      courtId: _ctx.courtId,
      label: _input.label,
      startTime: _input.startTime,
      endTime: _input.endTime,
      pricePerHourCents: _input.pricePerHourCents,
    });
  }
}

export class UpdateCourtPricingTierUseCase {
  constructor(
    private readonly _pricingTierRepository: CourtPricingTierRepository,
    private readonly _courtRepository: ICourtRepository,
    private readonly _venueStaffRepository: VenueStaffRepository,
  ) {}

  /**
   * @name    :executeSV
   * @version :1.0.0
   * @description :Actualiza una franja horaria. El rango se revalida contra los
   * valores que quedarian tras el patch, no solo contra los que vienen.
   * @param {VenueCourtContext & {tierId: string}} _ctx - Actor, sede, cancha y tarifa
   * @param {Object} _patch - Campos a modificar
   * @return {Promise<CourtPricingTier>}
   */
  async executeSV(
    _ctx: VenueCourtContext & { tierId: string },
    _patch: {
      label?: string | undefined;
      startTime?: string | undefined;
      endTime?: string | undefined;
      pricePerHourCents?: number | undefined;
    },
  ): Promise<CourtPricingTier> {
    await assertVenueStaffAndCourtSV(_ctx, this._venueStaffRepository, this._courtRepository);

    const TIER = await assertTierBelongsToCourtSV(
      _ctx.tierId,
      _ctx.courtId,
      this._pricingTierRepository,
    );

    const START = _patch.startTime ?? TIER.startTime;
    const END = _patch.endTime ?? TIER.endTime;
    assertValidPricingTimeRangeSV(START, END);

    return this._pricingTierRepository.updateSV(_ctx.tierId, _patch);
  }
}

export class DeleteCourtPricingTierUseCase {
  constructor(
    private readonly _pricingTierRepository: CourtPricingTierRepository,
    private readonly _courtRepository: ICourtRepository,
    private readonly _venueStaffRepository: VenueStaffRepository,
  ) {}

  /**
   * @name    :executeSV
   * @version :1.0.0
   * @description :Borra una franja horaria de una cancha.
   * @param {VenueCourtContext & {tierId: string}} _ctx - Actor, sede, cancha y tarifa
   * @return {Promise<void>}
   */
  async executeSV(_ctx: VenueCourtContext & { tierId: string }): Promise<void> {
    await assertVenueStaffAndCourtSV(_ctx, this._venueStaffRepository, this._courtRepository);

    await assertTierBelongsToCourtSV(_ctx.tierId, _ctx.courtId, this._pricingTierRepository);

    await this._pricingTierRepository.deleteSV(_ctx.tierId);
  }
}
