import { CreateMatchObligationUseCase } from '../../application/use_cases/create_match_obligation.use_case.js';
import { CreateReservationObligationUseCase } from '../../application/use_cases/create_reservation_obligation.use_case.js';
import { ConfirmTransactionAsVenueStaffUseCase } from '../../application/use_cases/confirm_transaction_as_venue_staff.use_case.js';
import { GetMatchTransactionsSummaryUseCase } from '../../application/use_cases/get_match_transactions_summary.use_case.js';
import { GetReservationPaymentSummaryUseCase } from '../../application/use_cases/get_reservation_payment_summary.use_case.js';
import { ListUserTransactionsUseCase } from '../../application/use_cases/list_user_transactions.use_case.js';
import { ListVenuePendingTransactionsUseCase } from '../../application/use_cases/list_venue_pending_transactions.use_case.js';
import { RejectTransactionAsVenueStaffUseCase } from '../../application/use_cases/reject_transaction_as_venue_staff.use_case.js';
import { UpdateUserSubscriptionUseCase } from '../../application/use_cases/update_user_subscription.use_case.js';
import { PaymentOrchestrator } from '../../application/payment/payment_orchestrator.js';
import { PrismaPaymentMatchReadRepository } from '../../infrastructure/adapters/prisma_payment_match_read_repository.js';
import { PrismaPaymentReservationReadRepository } from '../../infrastructure/adapters/prisma_payment_reservation_read_repository.js';
import { PrismaPaymentTransactionRepository } from '../../infrastructure/adapters/prisma_payment_transaction_repository.js';
import { PrismaUserSubscriptionRepository } from '../../infrastructure/adapters/prisma_user_subscription_repository.js';
import { PrismaVenueFeeRuleRepository } from '../../infrastructure/adapters/prisma_venue_fee_rule_repository.js';
import { PrismaVenueStaffRepository } from '../../infrastructure/adapters/prisma_venue_staff_repository.js';

const PAYMENT_TX_REPOSITORY = new PrismaPaymentTransactionRepository();
const FEE_RULE_REPOSITORY = new PrismaVenueFeeRuleRepository();
const MATCH_READ_REPOSITORY = new PrismaPaymentMatchReadRepository();
const RESERVATION_READ_REPOSITORY = new PrismaPaymentReservationReadRepository();
const USER_SUBSCRIPTION_REPOSITORY = new PrismaUserSubscriptionRepository();
const VENUE_STAFF_REPOSITORY = new PrismaVenueStaffRepository();

export const CREATE_MATCH_OBLIGATION_UC = new CreateMatchObligationUseCase(
  MATCH_READ_REPOSITORY,
  PAYMENT_TX_REPOSITORY,
  FEE_RULE_REPOSITORY,
);

export const CREATE_RESERVATION_OBLIGATION_UC = new CreateReservationObligationUseCase(
  RESERVATION_READ_REPOSITORY,
  PAYMENT_TX_REPOSITORY,
  FEE_RULE_REPOSITORY,
);

export const GET_MATCH_TRANSACTIONS_SUMMARY_UC = new GetMatchTransactionsSummaryUseCase(
  MATCH_READ_REPOSITORY,
  PAYMENT_TX_REPOSITORY,
);

export const GET_RESERVATION_PAYMENT_SUMMARY_UC = new GetReservationPaymentSummaryUseCase(
  RESERVATION_READ_REPOSITORY,
  PAYMENT_TX_REPOSITORY,
);

export const LIST_USER_TRANSACTIONS_UC = new ListUserTransactionsUseCase(
  USER_SUBSCRIPTION_REPOSITORY,
  PAYMENT_TX_REPOSITORY,
);

export const UPDATE_USER_SUBSCRIPTION_UC = new UpdateUserSubscriptionUseCase(
  USER_SUBSCRIPTION_REPOSITORY,
);

export const CONFIRM_TRANSACTION_AS_VENUE_STAFF_UC = new ConfirmTransactionAsVenueStaffUseCase(
  VENUE_STAFF_REPOSITORY,
  PAYMENT_TX_REPOSITORY,
);

export const LIST_VENUE_PENDING_TRANSACTIONS_UC = new ListVenuePendingTransactionsUseCase(
  VENUE_STAFF_REPOSITORY,
  PAYMENT_TX_REPOSITORY,
);

export const REJECT_TRANSACTION_AS_VENUE_STAFF_UC = new RejectTransactionAsVenueStaffUseCase(
  VENUE_STAFF_REPOSITORY,
  PAYMENT_TX_REPOSITORY,
);

export const PAYMENT_ORCHESTRATOR = new PaymentOrchestrator(
  CREATE_MATCH_OBLIGATION_UC,
  CREATE_RESERVATION_OBLIGATION_UC,
  GET_MATCH_TRANSACTIONS_SUMMARY_UC,
  GET_RESERVATION_PAYMENT_SUMMARY_UC,
  LIST_USER_TRANSACTIONS_UC,
  UPDATE_USER_SUBSCRIPTION_UC,
);
