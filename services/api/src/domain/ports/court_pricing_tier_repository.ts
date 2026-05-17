import type { CourtPricingTier } from '../entities/booking/court.entity.js';

export type CreateCourtPricingTierInputDTO = {
  courtId: string;
  label: string;
  startTime: string;
  endTime: string;
  pricePerHourCents: number;
};

export type UpdateCourtPricingTierInputDTO = {
  label?: string;
  startTime?: string;
  endTime?: string;
  pricePerHourCents?: number;
};

export interface CourtPricingTierRepository {
  listByCourtIdSV(_courtId: string): Promise<CourtPricingTier[]>;
  findByIdSV(_tierId: string): Promise<CourtPricingTier | null>;
  createSV(_input: CreateCourtPricingTierInputDTO): Promise<CourtPricingTier>;
  updateSV(_tierId: string, _patch: UpdateCourtPricingTierInputDTO): Promise<CourtPricingTier>;
  deleteSV(_tierId: string): Promise<void>;
}
