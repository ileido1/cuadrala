import { AppError } from '../../domain/errors/app_error.js';
import type { CurrencyCode } from '../../domain/money/currency_code.js';
import type { PaymentReservationReadRepository } from '../../domain/ports/payment_reservation_read_repository.js';
import type { ReservationLedgerRepository } from '../../domain/ports/reservation_ledger_repository.js';
import { isReservationPaymentLedgerEnabledSV } from '../../config/feature_flags.js';

/** Par DEBIT/CREDIT compensatorio (REQ-MCP-054, REQ-MCP-057). */
export class CreateCompensatoryLedgerAdjustmentUseCase {
  constructor(
    private readonly _ledgerRepository: ReservationLedgerRepository,
    private readonly _reservationReadRepository: PaymentReservationReadRepository,
  ) {}

  async executeSV(_input: {
    venueId: string;
    reservationId: string;
    amountMinor: bigint;
    currencyCode: CurrencyCode;
    amountBsMinor: bigint;
    actorUserId: string;
    reason: string;
  }): Promise<{ debitEntryId: string; creditEntryId: string }> {
    if (!isReservationPaymentLedgerEnabledSV()) {
      throw new AppError(
        'FUNCIONALIDAD_NO_DISPONIBLE',
        'El libro mayor de reservas no está activo.',
        503,
      );
    }

    const RESERVATION = await this._reservationReadRepository.findByIdSV(
      _input.reservationId,
    );
    if (RESERVATION === null) {
      throw new AppError('RESERVA_NO_ENCONTRADA', 'La reserva indicada no existe.', 404);
    }
    if (RESERVATION.venueId !== _input.venueId) {
      throw new AppError(
        'RESERVA_NO_PERTENECE_SEDE',
        'La reserva no pertenece a esta sede.',
        404,
      );
    }

    if (_input.amountMinor <= 0n || _input.amountBsMinor <= 0n) {
      throw new AppError(
        'VALIDACION_FALLIDA',
        'Los montos del ajuste deben ser mayores que cero.',
        400,
      );
    }

    const BASE = {
      reservationId: _input.reservationId,
      entryType: 'ADJUSTMENT' as const,
      amountMinor: _input.amountMinor,
      currencyCode: _input.currencyCode,
      amountBsMinor: _input.amountBsMinor,
      actorUserId: _input.actorUserId,
      reason: _input.reason,
    };

    const DEBIT = await this._ledgerRepository.appendEntrySV({
      ...BASE,
      direction: 'DEBIT',
    });
    const CREDIT = await this._ledgerRepository.appendEntrySV({
      ...BASE,
      direction: 'CREDIT',
    });

    return { debitEntryId: DEBIT.id, creditEntryId: CREDIT.id };
  }
}
