import type {
  VenuePaymentMethodDTO,
  VenuePaymentMethodType,
} from '../../domain/entities/payments/venue_payment_method.entity.js';
import type { VenuePaymentMethodRepository } from '../../domain/ports/venue_payment_method_repository.js';

import { PRISMA } from '../prisma_client.js';
import { loadVenuePricingCurrencySV } from '../prisma_money_fields.js';

function mapVenuePaymentMethodSV(_row: {
  id: string;
  venueId: string;
  type: string;
  name: string;
  config: unknown;
  settlementCurrency: string;
  isActive: boolean;
  position: number;
}): VenuePaymentMethodDTO {
  return {
    id: _row.id,
    venueId: _row.venueId,
    type: _row.type as VenuePaymentMethodType,
    name: _row.name,
    config: _row.config as VenuePaymentMethodDTO['config'],
    settlementCurrency: _row.settlementCurrency,
    isActive: _row.isActive,
    position: _row.position,
  };
}

export class PrismaVenuePaymentMethodRepository implements VenuePaymentMethodRepository {
  async listActiveByVenueSV(_venueId: string): Promise<VenuePaymentMethodDTO[]> {
    const ROWS = await PRISMA.venuePaymentMethod.findMany({
      where: { venueId: _venueId, isActive: true },
      orderBy: { position: 'asc' },
    });
    return ROWS.map(mapVenuePaymentMethodSV);
  }

  async listByVenueSV(_venueId: string): Promise<VenuePaymentMethodDTO[]> {
    const ROWS = await PRISMA.venuePaymentMethod.findMany({
      where: { venueId: _venueId },
      orderBy: { position: 'asc' },
    });
    return ROWS.map(mapVenuePaymentMethodSV);
  }

  async findByIdSV(_id: string): Promise<VenuePaymentMethodDTO | null> {
    const ROW = await PRISMA.venuePaymentMethod.findUnique({ where: { id: _id } });
    return ROW ? mapVenuePaymentMethodSV(ROW) : null;
  }

  async createSV(_data: {
    venueId: string;
    type: VenuePaymentMethodType;
    name: string;
    config: VenuePaymentMethodDTO['config'];
    position: number;
  }): Promise<VenuePaymentMethodDTO> {
    const SETTLEMENT_CURRENCY = await loadVenuePricingCurrencySV(PRISMA, _data.venueId);
    const ROW = await PRISMA.venuePaymentMethod.create({
      data: {
        venueId: _data.venueId,
        type: _data.type,
        name: _data.name,
        config: _data.config as object,
        position: _data.position,
        isActive: true,
        settlementCurrency: SETTLEMENT_CURRENCY,
      },
    });
    return mapVenuePaymentMethodSV(ROW);
  }

  async updateSV(
    _id: string,
    _data: {
      type?: VenuePaymentMethodType;
      name?: string;
      config?: VenuePaymentMethodDTO['config'];
      isActive?: boolean;
      position?: number;
    },
  ): Promise<VenuePaymentMethodDTO> {
    const ROW = await PRISMA.venuePaymentMethod.update({
      where: { id: _id },
      data: {
        ...(_data.type !== undefined && { type: _data.type }),
        ...(_data.name !== undefined && { name: _data.name }),
        ...(_data.config !== undefined && { config: _data.config as object }),
        ...(_data.isActive !== undefined && { isActive: _data.isActive }),
        ...(_data.position !== undefined && { position: _data.position }),
      },
    });
    return mapVenuePaymentMethodSV(ROW);
  }

  async deleteSV(_id: string): Promise<void> {
    await PRISMA.venuePaymentMethod.delete({ where: { id: _id } });
  }

  async getNextPositionSV(_venueId: string): Promise<number> {
    const MAX = await PRISMA.venuePaymentMethod.aggregate({
      where: { venueId: _venueId },
      _max: { position: true },
    });
    return (MAX._max.position ?? -1) + 1;
  }
}
