import { AppError } from '../../domain/errors/app_error.js';
import type { PaymentMatchReadRepository } from '../../domain/ports/payment_match_read_repository.js';
import type { PaymentTransactionRepository } from '../../domain/ports/payment_transaction_repository.js';

export class GetMatchTransactionsSummaryUseCase {
  constructor(
    private readonly _matchReadRepository: PaymentMatchReadRepository,
    private readonly _transactionRepository: PaymentTransactionRepository,
  ) {}

  async executeSV(_matchId: string): Promise<{
    matchId: string;
    transactionCount: number;
    totalAmountBase: string;
    totalFeeAmount: string;
    totalAmount: string;
    pendingCount: number;
    confirmedCount: number;
    cancelledCount: number;
  }> {
    const MATCH = await this._matchReadRepository.findByIdSV(_matchId);
    if (MATCH === null) {
      throw new AppError('PARTIDO_NO_ENCONTRADO', 'El partido indicado no existe.', 404);
    }

    const ROWS = await this._transactionRepository.listByMatchSV(_matchId);
    let totalBase = 0;
    let totalFee = 0;
    let totalAll = 0;
    let pending = 0;
    let confirmed = 0;
    let cancelled = 0;

    for (const _r of ROWS) {
      totalBase += Number(_r.amountBase.toString());
      totalFee += Number(_r.feeAmount.toString());
      totalAll += Number(_r.amountTotal.toString());
      if (_r.status === 'PENDING') pending += 1;
      else if (_r.status === 'CONFIRMED') confirmed += 1;
      else if (_r.status === 'CANCELLED') cancelled += 1;
    }

    return {
      matchId: _matchId,
      transactionCount: ROWS.length,
      totalAmountBase: String(totalBase),
      totalFeeAmount: String(totalFee),
      totalAmount: String(totalAll),
      pendingCount: pending,
      confirmedCount: confirmed,
      cancelledCount: cancelled,
    };
  }
}
