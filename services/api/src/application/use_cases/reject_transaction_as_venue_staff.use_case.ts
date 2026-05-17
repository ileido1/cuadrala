import { AppError } from '../../domain/errors/app_error.js';
import type { PaymentTransactionRepository } from '../../domain/ports/payment_transaction_repository.js';
import type { VenueStaffRepository } from '../../domain/ports/venue_staff_repository.js';

export class RejectTransactionAsVenueStaffUseCase {
  constructor(
    private readonly _venueStaffRepository: VenueStaffRepository,
    private readonly _transactionRepository: PaymentTransactionRepository,
  ) {}

  async executeSV(_input: {
    transactionId: string;
    userId: string;
  }): Promise<{ id: string; status: string }> {
    const TX = await this._transactionRepository.findForStaffConfirmSV(
      _input.transactionId,
    );
    if (TX === null) {
      throw new AppError('TRANSACCION_NO_ENCONTRADA', 'La transaccion no existe.', 404);
    }
    if (TX.status !== 'PENDING') {
      throw new AppError(
        'TRANSACCION_NO_PENDIENTE',
        'Solo se pueden rechazar transacciones pendientes.',
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
      throw new AppError('NO_AUTORIZADO', 'No se pudo verificar la sede.', 403);
    }

    const IS_STAFF = await this._venueStaffRepository.isUserStaffOfVenueSV(
      _input.userId,
      VENUE_ID,
    );
    if (!IS_STAFF) {
      throw new AppError('NO_AUTORIZADO', 'Solo el staff de la sede puede rechazar pagos.', 403);
    }

    return this._transactionRepository.rejectManualSV(_input.transactionId);
  }
}
