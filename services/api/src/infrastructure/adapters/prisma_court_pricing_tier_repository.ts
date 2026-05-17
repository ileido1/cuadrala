import type { CourtPricingTier } from '../../domain/entities/booking/court.entity.js';
import type {
  CourtPricingTierRepository,
  CreateCourtPricingTierInputDTO,
  UpdateCourtPricingTierInputDTO,
} from '../../domain/ports/court_pricing_tier_repository.js';
import { PRISMA } from '../prisma_client.js';

function mapTierSV(_row: {
  id: string;
  courtId: string;
  label: string;
  startTime: string;
  endTime: string;
  pricePerHourCents: number;
}): CourtPricingTier {
  return {
    id: _row.id,
    courtId: _row.courtId,
    label: _row.label,
    startTime: _row.startTime,
    endTime: _row.endTime,
    pricePerHourCents: _row.pricePerHourCents,
  };
}

export class PrismaCourtPricingTierRepository implements CourtPricingTierRepository {
  async listByCourtIdSV(_courtId: string): Promise<CourtPricingTier[]> {
    const ROWS = await PRISMA.courtPricingTier.findMany({
      where: { courtId: _courtId },
      orderBy: { startTime: 'asc' },
    });
    return ROWS.map(mapTierSV);
  }

  async findByIdSV(_tierId: string): Promise<CourtPricingTier | null> {
    const ROW = await PRISMA.courtPricingTier.findUnique({
      where: { id: _tierId },
    });
    return ROW === null ? null : mapTierSV(ROW);
  }

  async createSV(_input: CreateCourtPricingTierInputDTO): Promise<CourtPricingTier> {
    const ROW = await PRISMA.courtPricingTier.create({
      data: {
        courtId: _input.courtId,
        label: _input.label,
        startTime: _input.startTime,
        endTime: _input.endTime,
        pricePerHourCents: _input.pricePerHourCents,
      },
    });
    return mapTierSV(ROW);
  }

  async updateSV(
    _tierId: string,
    _patch: UpdateCourtPricingTierInputDTO,
  ): Promise<CourtPricingTier> {
    const ROW = await PRISMA.courtPricingTier.update({
      where: { id: _tierId },
      data: {
        ...(_patch.label !== undefined ? { label: _patch.label } : {}),
        ...(_patch.startTime !== undefined ? { startTime: _patch.startTime } : {}),
        ...(_patch.endTime !== undefined ? { endTime: _patch.endTime } : {}),
        ...(_patch.pricePerHourCents !== undefined
          ? { pricePerHourCents: _patch.pricePerHourCents }
          : {}),
      },
    });
    return mapTierSV(ROW);
  }

  async deleteSV(_tierId: string): Promise<void> {
    await PRISMA.courtPricingTier.delete({ where: { id: _tierId } });
  }
}
