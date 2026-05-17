import type { CreateMatchObligationUseCase } from '../use_cases/create_match_obligation.use_case.js';
import type { CreateReservationObligationUseCase } from '../use_cases/create_reservation_obligation.use_case.js';
import type { GetMatchTransactionsSummaryUseCase } from '../use_cases/get_match_transactions_summary.use_case.js';
import type { GetReservationPaymentSummaryUseCase } from '../use_cases/get_reservation_payment_summary.use_case.js';
import type { ListUserTransactionsUseCase } from '../use_cases/list_user_transactions.use_case.js';
import type { UpdateUserSubscriptionUseCase } from '../use_cases/update_user_subscription.use_case.js';

/** Facade delgado para flujos de monetización (sin imports de infrastructure). */
export class PaymentOrchestrator {
  constructor(
    private readonly _createMatchObligation: CreateMatchObligationUseCase,
    private readonly _createReservationObligation: CreateReservationObligationUseCase,
    private readonly _getMatchSummary: GetMatchTransactionsSummaryUseCase,
    private readonly _getReservationSummary: GetReservationPaymentSummaryUseCase,
    private readonly _listUserTransactions: ListUserTransactionsUseCase,
    private readonly _updateUserSubscription: UpdateUserSubscriptionUseCase,
  ) {}

  createMatchObligationSV = (
    ..._args: Parameters<CreateMatchObligationUseCase['executeSV']>
  ) => this._createMatchObligation.executeSV(..._args);

  createReservationObligationSV = (
    ..._args: Parameters<CreateReservationObligationUseCase['executeSV']>
  ) => this._createReservationObligation.executeSV(..._args);

  getMatchTransactionsSummarySV = (
    ..._args: Parameters<GetMatchTransactionsSummaryUseCase['executeSV']>
  ) => this._getMatchSummary.executeSV(..._args);

  getReservationPaymentSummarySV = (
    ..._args: Parameters<GetReservationPaymentSummaryUseCase['executeSV']>
  ) => this._getReservationSummary.executeSV(..._args);

  listUserTransactionsSV = (
    ..._args: Parameters<ListUserTransactionsUseCase['executeSV']>
  ) => this._listUserTransactions.executeSV(..._args);

  updateUserSubscriptionSV = (
    ..._args: Parameters<UpdateUserSubscriptionUseCase['executeSV']>
  ) => this._updateUserSubscription.executeSV(..._args);
}
