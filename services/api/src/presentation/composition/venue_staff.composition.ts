import { PrismaVenueStaffRepository } from '../../infrastructure/adapters/prisma_venue_staff_repository.js';
import { PRISMA } from '../../infrastructure/prisma_client.js';
import { ListVenuePendingTransactionsUseCase } from '../../application/use_cases/list_venue_pending_transactions.use_case.js';
import { ListVenueStaffUseCase } from '../../application/use_cases/list_venue_staff.use_case.js';
import { UpsertVenueStaffUseCase } from '../../application/use_cases/upsert_venue_staff.use_case.js';
import { ConfirmTransactionAsVenueStaffUseCase } from '../../application/use_cases/confirm_transaction_as_venue_staff.use_case.js';

const VENUE_STAFF_REPO = new PrismaVenueStaffRepository();

export const UPSERT_VENUE_STAFF_UC = new UpsertVenueStaffUseCase(VENUE_STAFF_REPO);
export const LIST_VENUE_STAFF_UC = new ListVenueStaffUseCase(VENUE_STAFF_REPO);
export const LIST_VENUE_PENDING_TRANSACTIONS_UC = new ListVenuePendingTransactionsUseCase(VENUE_STAFF_REPO);
export const CONFIRM_TRANSACTION_AS_VENUE_STAFF_UC = new ConfirmTransactionAsVenueStaffUseCase(VENUE_STAFF_REPO, PRISMA);
