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
      payerName: string;
      payerEmail: string | null;
      obligationAmountMinor: string | null;
      obligationCurrency: string | null;
      pricingCurrency: string | null;
      contextLabel: string;
      bookingType: 'MATCH' | 'DIRECT';
      courtId: string;
      courtName: string;
      sportId: string;
      categoryId: string;
      scheduledAt: string;
      durationMinutes: number;
      receiptId: string | null;
      receiptMimeType: string | null;
      paymentMethodType: string | null;
      paymentMethodName: string | null;
      paymentMethodConfig: Record<string, unknown> | null;
      venuePaymentMethodId: string | null;
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
        payerName: tx.payerName,
        payerEmail: tx.payerEmail,
        obligationAmountMinor: tx.obligationAmountMinor,
        obligationCurrency: tx.obligationCurrency,
        pricingCurrency: tx.pricingCurrency,
        contextLabel: tx.contextLabel,
        bookingType: tx.bookingType,
        courtId: tx.courtId,
        courtName: tx.courtName,
        sportId: tx.sportId,
        categoryId: tx.categoryId,
        scheduledAt: tx.scheduledAt.toISOString(),
        durationMinutes: tx.durationMinutes,
        receiptId: tx.receiptId,
        receiptMimeType: tx.receiptMimeType,
        paymentMethodType: tx.paymentMethodType,
        paymentMethodName: tx.paymentMethodName,
        paymentMethodConfig: tx.paymentMethodConfig,
        venuePaymentMethodId: tx.venuePaymentMethodId,
      })),
    };
  }
}
