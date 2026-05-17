import { AppError } from '../../domain/errors/app_error.js';
import type { PaymentReservationReadRepository } from '../../domain/ports/payment_reservation_read_repository.js';
import type { PaymentTransactionRepository } from '../../domain/ports/payment_transaction_repository.js';
import type { VenueFeeRuleRepository } from '../../domain/ports/venue_fee_rule_repository.js';
import { computeFeeAmountSV } from '../../domain/services/payments/fee_policy.service.js';
import type { CreateObligationsResultDTO } from '../dto/payment_obligation.dto.js';

export type CreateReservationObligationInput = {
  reservationId: string;
  amountBasePerPerson: number;
  participantUserIds?: string[];
};

export class CreateReservationObligationUseCase {
  constructor(
    private readonly _reservationReadRepository: PaymentReservationReadRepository,
    private readonly _transactionRepository: PaymentTransactionRepository,
    private readonly _feeRuleRepository: VenueFeeRuleRepository,
  ) {}

  async executeSV(
    _input: CreateReservationObligationInput,
  ): Promise<CreateObligationsResultDTO> {
    if (!Number.isFinite(_input.amountBasePerPerson) || _input.amountBasePerPerson <= 0) {
      throw new AppError('MONTO_INVALIDO', 'El monto base por persona debe ser mayor que cero.', 400);
    }

    const RESERVATION = await this._reservationReadRepository.findByIdSV(
      _input.reservationId,
    );
    if (RESERVATION === null) {
      throw new AppError('RESERVA_NO_ENCONTRADA', 'La reserva indicada no existe.', 404);
    }

    const RULE = await this._feeRuleRepository.findActiveForScopeSV('RESERVATION');
    const AMOUNT_BASE = String(_input.amountBasePerPerson);
    const AMOUNT_BASE_NUMBER = _input.amountBasePerPerson;
    const CREATED: CreateObligationsResultDTO['created'] = [];
    const SKIPPED: CreateObligationsResultDTO['skipped'] = [];
    const TARGET_IDS = _input.participantUserIds ?? [];

    for (const _userId of TARGET_IDS) {
      const PENDING = await this._transactionRepository.findPendingForReservationUserSV(
        _input.reservationId,
        _userId,
      );
      if (PENDING !== null) {
        SKIPPED.push({ userId: _userId, reason: 'ALREADY_HAS_ACTIVE_OBLIGATION' });
        continue;
      }

      const FEE_NUMBER = computeFeeAmountSV(AMOUNT_BASE_NUMBER, RULE);
      const FEE = String(FEE_NUMBER);
      const TOTAL = String(AMOUNT_BASE_NUMBER + FEE_NUMBER);

      const ROW = await this._transactionRepository.createSV({
        reservationId: _input.reservationId,
        userId: _userId,
        amountBase: AMOUNT_BASE,
        feeAmount: FEE,
        amountTotal: TOTAL,
      });

      CREATED.push({
        id: ROW.id,
        userId: ROW.userId,
        amountBase: ROW.amountBase.toString(),
        feeAmount: ROW.feeAmount.toString(),
        amountTotal: ROW.amountTotal.toString(),
        status: ROW.status,
      });
    }

    if (
      RESERVATION.totalAmountCents == null
      && RESERVATION.court?.pricePerHourCents != null
    ) {
      const DURATION =
        RESERVATION.durationMinutes ?? RESERVATION.court.durationMinutes ?? 60;
      const TOTAL_FROM_COURT = Math.round(
        (RESERVATION.court.pricePerHourCents * DURATION) / 60,
      );
      await this._reservationReadRepository.updateTotalAmountCentsSV(
        _input.reservationId,
        TOTAL_FROM_COURT,
      );
    }

    return { created: CREATED, skipped: SKIPPED };
  }
}
