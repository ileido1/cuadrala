import { AppError } from '../../domain/errors/app_error.js';
import type { VenueStaffRepository } from '../../domain/ports/venue_staff_repository.js';
import type { PaymentTransactionRepository } from '../../domain/ports/payment_transaction_repository.js';

export class ConfirmTransactionAsVenueStaffUseCase {
  constructor(
    private readonly _venueStaffRepository: VenueStaffRepository,
    private readonly _transactionRepository: PaymentTransactionRepository,
  ) {}

  async executeSV(_input: {
    transactionId: string;
    userId: string;
    venuePaymentMethodId?: string;
    referenceNumber?: string;
    paymentData?: object;
  }): Promise<{ id: string; status: string; confirmedAt: string }> {
    const TX = await this._transactionRepository.findForStaffConfirmSV(
      _input.transactionId,
    );

    if (!TX) {
      throw new AppError('TRANSACCION_NO_ENCONTRADA', 'La transacción indicada no existe.', 404);
    }
    if (TX.status === 'CONFIRMED') {
      return {
        id: TX.id,
        status: TX.status,
        confirmedAt: TX.confirmedAt?.toISOString() ?? '',
      };
    }
    if (TX.status !== 'PENDING') {
      throw new AppError(
        'TRANSACCION_NO_PENDIENTE',
        'Solo se pueden confirmar transacciones pendientes.',
        400,
      );
    }

    let VENUE_ID: string | null = null;
    if (TX.matchId !== null) {
      VENUE_ID = TX.match?.court?.venueId ?? null;
    } else if (TX.reservationId !== null) {
      VENUE_ID =
        TX.reservation?.venueId
        ?? TX.reservation?.court?.venueId
        ?? null;
    }

    if (VENUE_ID === null) {
      throw new AppError(
        'ENTIDAD_SIN_SEDE',
        'La transacción no tiene una sede asignada. No se puede confirmar el pago.',
        400,
      );
    }

    const IS_STAFF = await this._venueStaffRepository.isUserStaffOfVenueSV(
      _input.userId,
      VENUE_ID,
    );
    if (!IS_STAFF) {
      throw new AppError(
        'NO_AUTORIZADO',
        'Solo el staff de la sede puede confirmar pagos.',
        403,
      );
    }

    const UPDATED = await this._transactionRepository.confirmManualSV({
      transactionId: _input.transactionId,
      venuePaymentMethodId: _input.venuePaymentMethodId,
      referenceNumber: _input.referenceNumber,
      paymentData: _input.paymentData,
      confirmedBy: _input.userId,
    });

    if (TX.reservationId !== null) {
      await this._transactionRepository.syncReservationPaymentSV(TX.reservationId);
    }

    return {
      id: UPDATED.id,
      status: UPDATED.status,
      confirmedAt: UPDATED.confirmedAt.toISOString(),
    };
  }
}
