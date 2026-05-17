import { AppError } from '../../domain/errors/app_error.js';
import type { VenueStaffRepository } from '../../domain/ports/venue_staff_repository.js';
import type { PaymentTransactionRepository } from '../../domain/ports/payment_transaction_repository.js';

export class ListVenuePendingTransactionsUseCase {
  constructor(
    private readonly _venueStaffRepository: VenueStaffRepository,
    private readonly _transactionRepository: PaymentTransactionRepository,
  ) {}

  async executeSV(_input: {
    venueId: string;
    userId: string;
    from?: string;
    to?: string;
    matchId?: string;
    reservationId?: string;
    type?: 'MATCH' | 'RESERVATION';
  }): Promise<{
    items: Array<{
      id: string;
      matchId: string | null;
      reservationId: string | null;
      userId: string;
      amountTotal: string;
      status: string;
      createdAt: string;
    }>;
  }> {
    const IS_STAFF = await this._venueStaffRepository.isUserStaffOfVenueSV(
      _input.userId,
      _input.venueId,
    );
    if (!IS_STAFF) {
      throw new AppError(
        'NO_AUTORIZADO',
        'Solo el staff de la sede puede ver las transacciones pendientes.',
        403,
      );
    }

    const ROWS = await this._transactionRepository.listPendingByVenueSV(
      _input.venueId,
      {
        ...(_input.from !== undefined ? { from: _input.from } : {}),
        ...(_input.to !== undefined ? { to: _input.to } : {}),
        ...(_input.matchId !== undefined ? { matchId: _input.matchId } : {}),
        ...(_input.reservationId !== undefined ? { reservationId: _input.reservationId } : {}),
        ...(_input.type !== undefined ? { type: _input.type } : {}),
      },
    );

    return {
      items: ROWS.map((tx) => ({
        id: tx.id,
        matchId: tx.matchId,
        reservationId: tx.reservationId,
        userId: tx.userId,
        amountTotal: tx.amountTotal.toString(),
        status: tx.status,
        createdAt: tx.createdAt.toISOString(),
      })),
    };
  }
}
