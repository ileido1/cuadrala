import type { VenueStaffRepository } from '../../domain/ports/venue_staff_repository.js';
import { listPendingTransactionsByVenueRepo } from '../../infrastructure/repositories/transaction.repository.js';

export class ListVenuePendingTransactionsUseCase {
  constructor(
    private readonly _venueStaffRepository: VenueStaffRepository,
  ) {}

  async executeSV(_input: {
    venueId: string;
    userId: string;
    from?: string;
    to?: string;
    matchId?: string;
  }): Promise<{
    items: Array<{
      id: string;
      matchId: string;
      userId: string;
      amountTotal: string;
      status: string;
      createdAt: string;
    }>;
  }> {
    // Verificar que el usuario sea staff del venue
    const IS_STAFF = await this._venueStaffRepository.isUserStaffOfVenueSV(
      _input.userId,
      _input.venueId,
    );
    if (!IS_STAFF) {
      const { AppError } = await import('../../domain/errors/app_error.js');
      throw new AppError(
        'NO_AUTORIZADO',
        'Solo el staff de la sede puede ver las transacciones pendientes.',
        403,
      );
    }

    const ROWS = await listPendingTransactionsByVenueRepo(_input.venueId, {
      ...(_input.from !== undefined ? { from: _input.from } : {}),
      ...(_input.to !== undefined ? { to: _input.to } : {}),
      ...(_input.matchId !== undefined ? { matchId: _input.matchId } : {}),
    });

    return {
      items: ROWS.map((tx) => ({
        id: tx.id,
        matchId: tx.matchId,
        userId: tx.userId,
        amountTotal: tx.amountTotal.toString(),
        status: tx.status,
        createdAt: tx.createdAt.toISOString(),
      })),
    };
  }
}
