import { AppError } from '../../domain/errors/app_error.js';
import type { PaymentTransactionRepository } from '../../domain/ports/payment_transaction_repository.js';
import type { UserSubscriptionRepository } from '../../domain/ports/user_subscription_repository.js';

export class ListUserTransactionsUseCase {
  constructor(
    private readonly _userRepository: UserSubscriptionRepository,
    private readonly _transactionRepository: PaymentTransactionRepository,
  ) {}

  async executeSV(_userId: string, _limit: number): Promise<{
    userId: string;
    transactions: Array<{
      id: string;
      matchId: string;
      reservationId: string;
      userId: string;
      amountBase: string;
      feeAmount: string;
      amountTotal: string;
      status: string;
      paymentMethod: string;
      confirmedAt: string | null;
      createdAt: string;
    }>;
  }> {
    const EXISTS = await this._userRepository.existsSV(_userId);
    if (!EXISTS) {
      throw new AppError('USUARIO_NO_ENCONTRADO', 'El usuario indicado no existe.', 404);
    }

    const ROWS = await this._transactionRepository.listByUserSV(_userId, _limit);

    return {
      userId: _userId,
      transactions: ROWS.map((_r) => ({
        id: _r.id,
        matchId: _r.matchId ?? '',
        reservationId: _r.reservationId ?? '',
        userId: _r.userId,
        amountBase: _r.amountBase.toString(),
        feeAmount: _r.feeAmount.toString(),
        amountTotal: _r.amountTotal.toString(),
        status: _r.status,
        paymentMethod: _r.paymentMethod,
        confirmedAt: _r.confirmedAt?.toISOString() ?? null,
        createdAt: _r.createdAt.toISOString(),
      })),
    };
  }
}
