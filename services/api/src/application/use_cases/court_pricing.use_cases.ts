import { AppError } from '../../domain/errors/app_error.js';
import type { CourtPricingTier } from '../../domain/entities/booking/court.entity.js';
import type { ICourtRepository } from '../../domain/ports/court_repository.js';
import type { CourtPricingTierRepository } from '../../domain/ports/court_pricing_tier_repository.js';
import type { VenueStaffRepository } from '../../domain/ports/venue_staff_repository.js';
import { assertValidPricingTimeRangeSV } from '../../domain/services/booking/pricing.service.js';

type VenueCourtContext = {
  venueId: string;
  courtId: string;
  actorUserId: string;
};

async function assertVenueStaffAndCourtSV(
  _ctx: VenueCourtContext,
  _venueStaffRepository: VenueStaffRepository,
  _courtRepository: ICourtRepository,
): Promise<void> {
  const IS_STAFF = await _venueStaffRepository.isUserStaffOfVenueSV(
    _ctx.actorUserId,
    _ctx.venueId,
  );
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

export class ListCourtPricingTiersUseCase {
  constructor(
    private readonly _pricingTierRepository: CourtPricingTierRepository,
    private readonly _venueStaffRepository: VenueStaffRepository,
    private readonly _courtRepository: ICourtRepository,
  ) {}

  async executeSV(_ctx: VenueCourtContext): Promise<{ items: CourtPricingTier[] }> {
    await assertVenueStaffAndCourtSV(_ctx, this._venueStaffRepository, this._courtRepository);
    const ITEMS = await this._pricingTierRepository.listByCourtIdSV(_ctx.courtId);
    return { items: ITEMS };
  }
}

export class CreateCourtPricingTierUseCase {
  constructor(
    private readonly _pricingTierRepository: CourtPricingTierRepository,
    private readonly _venueStaffRepository: VenueStaffRepository,
    private readonly _courtRepository: ICourtRepository,
  ) {}

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
    private readonly _venueStaffRepository: VenueStaffRepository,
    private readonly _courtRepository: ICourtRepository,
  ) {}

  async executeSV(
    _ctx: VenueCourtContext & { tierId: string },
    _patch: {
      label?: string;
      startTime?: string;
      endTime?: string;
      pricePerHourCents?: number;
    },
  ): Promise<CourtPricingTier> {
    await assertVenueStaffAndCourtSV(_ctx, this._venueStaffRepository, this._courtRepository);

    const TIER = await this._pricingTierRepository.findByIdSV(_ctx.tierId);
    if (TIER === null) {
      throw new AppError('TARIFA_NO_ENCONTRADA', 'La tarifa indicada no existe.', 404);
    }
    if (TIER.courtId !== _ctx.courtId) {
      throw new AppError('TARIFA_NO_PERTENECE_A_CANCHA', 'La tarifa no pertenece a esta cancha.', 400);
    }

    const START = _patch.startTime ?? TIER.startTime;
    const END = _patch.endTime ?? TIER.endTime;
    assertValidPricingTimeRangeSV(START, END);

    return this._pricingTierRepository.updateSV(_ctx.tierId, _patch);
  }
}

export class DeleteCourtPricingTierUseCase {
  constructor(
    private readonly _pricingTierRepository: CourtPricingTierRepository,
    private readonly _venueStaffRepository: VenueStaffRepository,
    private readonly _courtRepository: ICourtRepository,
  ) {}

  async executeSV(_ctx: VenueCourtContext & { tierId: string }): Promise<void> {
    await assertVenueStaffAndCourtSV(_ctx, this._venueStaffRepository, this._courtRepository);

    const TIER = await this._pricingTierRepository.findByIdSV(_ctx.tierId);
    if (TIER === null) {
      throw new AppError('TARIFA_NO_ENCONTRADA', 'La tarifa indicada no existe.', 404);
    }
    if (TIER.courtId !== _ctx.courtId) {
      throw new AppError('TARIFA_NO_PERTENECE_A_CANCHA', 'La tarifa no pertenece a esta cancha.', 400);
    }

    await this._pricingTierRepository.deleteSV(_ctx.tierId);
  }
}
