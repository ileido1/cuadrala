export {
  CONFIRM_TRANSACTION_AS_VENUE_STAFF_UC,
  LIST_VENUE_PENDING_TRANSACTIONS_UC,
} from './monetization.composition.js';

import { ListVenueStaffUseCase } from '../../application/use_cases/list_venue_staff.use_case.js';
import { UpsertVenueStaffUseCase } from '../../application/use_cases/upsert_venue_staff.use_case.js';
import { PrismaVenueStaffRepository } from '../../infrastructure/adapters/prisma_venue_staff_repository.js';
import { PRISMA } from '../../infrastructure/prisma_client.js';

const VENUE_STAFF_REPO = new PrismaVenueStaffRepository(PRISMA);

export const UPSERT_VENUE_STAFF_UC = new UpsertVenueStaffUseCase(VENUE_STAFF_REPO);
export const LIST_VENUE_STAFF_UC = new ListVenueStaffUseCase(VENUE_STAFF_REPO);
