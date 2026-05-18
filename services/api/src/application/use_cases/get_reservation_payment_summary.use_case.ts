import { AppError } from '../../domain/errors/app_error.js';
import type { PaymentReservationReadRepository } from '../../domain/ports/payment_reservation_read_repository.js';
import type { PaymentTransactionRepository } from '../../domain/ports/payment_transaction_repository.js';
import { moneyAmountDtoFromMinorSV } from '../dto/money.dto.js';
import type { MoneyAmountDTO } from '../dto/money.dto.js';
import { parseCurrencyCode } from '../../domain/money/currency_code.js';
import { isReservationPaymentLedgerEnabledSV } from '../../config/feature_flags.js';
import { calculateReservationTotalCentsSV } from '../../domain/services/booking/pricing.service.js';

export class GetReservationPaymentSummaryUseCase {
  constructor(
    private readonly _reservationReadRepository: PaymentReservationReadRepository,
    private readonly _transactionRepository: PaymentTransactionRepository,
  ) {}

  async executeSV(_reservationId: string): Promise<{
    reservationId: string;
    transactionCount: number;
    totalAmountBase: string;
    totalFeeAmount: string;
    totalAmount: string;
    totalAmountCents: number | null;
    paidAmountCents: number;
    paymentStatus: 'UNPAID' | 'PARTIAL' | 'PAID';
    pricingCurrency: string;
    reservationTotalAmount: MoneyAmountDTO | null;
    paidAmount: MoneyAmountDTO;
    paidAmountBs?: MoneyAmountDTO;
    pendingCount: number;
    confirmedCount: number;
    cancelledCount: number;
    items: Array<{ id: string; status: string; amountTotal: string }>;
  }> {
    const RESERVATION = await this._reservationReadRepository.findByIdSV(_reservationId);
    if (RESERVATION === null) {
      throw new AppError('RESERVA_NO_ENCONTRADA', 'La reserva indicada no existe.', 404);
    }

    if (RESERVATION.court != null) {
      const DURATION =
        RESERVATION.durationMinutes ?? RESERVATION.court.durationMinutes ?? 60;
      const TOTAL_FROM_COURT = calculateReservationTotalCentsSV({
        pricePerHourCents: RESERVATION.court.pricePerHourCents,
        pricingTiers: RESERVATION.court.pricingTiers,
        scheduledAt: RESERVATION.scheduledAt,
        durationMinutes: DURATION,
      });
      if (
        TOTAL_FROM_COURT != null
        && RESERVATION.totalAmountCents !== TOTAL_FROM_COURT
      ) {
        await this._reservationReadRepository.updateTotalAmountCentsSV(
          _reservationId,
          TOTAL_FROM_COURT,
        );
      }
    }

    const SYNCED = await this._transactionRepository.syncReservationPaymentSV(
      _reservationId,
    );

    const ROWS = await this._transactionRepository.listByReservationSV(_reservationId);
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

    const PRICING = parseCurrencyCode(SYNCED.pricingCurrency);

    const RESULT: {
      reservationId: string;
      transactionCount: number;
      totalAmountBase: string;
      totalFeeAmount: string;
      totalAmount: string;
      totalAmountCents: number | null;
      paidAmountCents: number;
      paymentStatus: 'UNPAID' | 'PARTIAL' | 'PAID';
      pricingCurrency: string;
      reservationTotalAmount: MoneyAmountDTO | null;
      paidAmount: MoneyAmountDTO;
      paidAmountBs?: MoneyAmountDTO;
      pendingCount: number;
      confirmedCount: number;
      cancelledCount: number;
      items: Array<{ id: string; status: string; amountTotal: string }>;
    } = {
      reservationId: _reservationId,
      transactionCount: ROWS.length,
      totalAmountBase: String(totalBase),
      totalFeeAmount: String(totalFee),
      totalAmount: String(totalAll),
      totalAmountCents: SYNCED.totalAmountCents,
      paidAmountCents: SYNCED.paidAmountCents,
      paymentStatus: SYNCED.paymentStatus,
      pricingCurrency: PRICING,
      reservationTotalAmount:
        SYNCED.totalAmountMinor !== null
          ? moneyAmountDtoFromMinorSV(PRICING, SYNCED.totalAmountMinor)
          : null,
      paidAmount: moneyAmountDtoFromMinorSV(PRICING, SYNCED.paidAmountMinor),
      pendingCount: pending,
      confirmedCount: confirmed,
      cancelledCount: cancelled,
      items: ROWS.map((_r) => ({
        id: _r.id,
        status: _r.status,
        amountTotal: _r.amountTotal.toString(),
      })),
    };

    if (
      isReservationPaymentLedgerEnabledSV()
      && SYNCED.paidAmountBsMinor !== null
    ) {
      RESULT.paidAmountBs = moneyAmountDtoFromMinorSV('BS', SYNCED.paidAmountBsMinor);
    }

    return RESULT;
  }
}
