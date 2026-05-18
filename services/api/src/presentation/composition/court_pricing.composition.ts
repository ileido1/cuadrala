import {
  CreateCourtPricingTierUseCase,
  DeleteCourtPricingTierUseCase,
  ListCourtPricingTiersUseCase,
  UpdateCourtPricingTierUseCase,
} from '../../application/use_cases/court_pricing.use_cases.js';
import { PrismaCourtPricingTierRepository } from '../../infrastructure/adapters/prisma_court_pricing_tier_repository.js';
import { PrismaCourtRepository } from '../../infrastructure/adapters/prisma_court_repository.js';
import { PrismaVenueStaffRepository } from '../../infrastructure/adapters/prisma_venue_staff_repository.js';
import { PRISMA } from '../../infrastructure/prisma_client.js';

const PRICING_TIER_REPOSITORY = new PrismaCourtPricingTierRepository();
const VENUE_STAFF_REPOSITORY = new PrismaVenueStaffRepository(PRISMA);
const COURT_REPOSITORY = new PrismaCourtRepository();

export const LIST_COURT_PRICING_TIERS_UC = new ListCourtPricingTiersUseCase(
  PRICING_TIER_REPOSITORY,
  VENUE_STAFF_REPOSITORY,
  COURT_REPOSITORY,
);

export const CREATE_COURT_PRICING_TIER_UC = new CreateCourtPricingTierUseCase(
  PRICING_TIER_REPOSITORY,
  VENUE_STAFF_REPOSITORY,
  COURT_REPOSITORY,
);

export const UPDATE_COURT_PRICING_TIER_UC = new UpdateCourtPricingTierUseCase(
  PRICING_TIER_REPOSITORY,
  VENUE_STAFF_REPOSITORY,
  COURT_REPOSITORY,
);

export const DELETE_COURT_PRICING_TIER_UC = new DeleteCourtPricingTierUseCase(
  PRICING_TIER_REPOSITORY,
  VENUE_STAFF_REPOSITORY,
  COURT_REPOSITORY,
);
