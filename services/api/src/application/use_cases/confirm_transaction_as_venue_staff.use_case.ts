import type { PrismaClient } from '../../generated/prisma/client.js';

import { AppError } from '../../domain/errors/app_error.js';
import type { VenueStaffRepository } from '../../domain/ports/venue_staff_repository.js';
import {
  findTransactionWithVenueRepo,
  findTransactionWithReservationVenueRepo,
  updateReservationPaymentFromTransactionRepo,
} from '../../infrastructure/repositories/transaction.repository.js';

export class ConfirmTransactionAsVenueStaffUseCase {
  constructor(
    private readonly _venueStaffRepository: VenueStaffRepository,
    private readonly _prisma: PrismaClient,
  ) {}

  async executeSV(_input: {
    transactionId: string;
    userId: string;
  }): Promise<{ id: string; status: string; confirmedAt: string }> {
    // Support both match and reservation transactions
    const TX_WITH_MATCH = await findTransactionWithVenueRepo(_input.transactionId);
    const TX_WITH_RESERVATION = await findTransactionWithReservationVenueRepo(_input.transactionId);
    const TX = TX_WITH_MATCH ?? TX_WITH_RESERVATION;

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

    // Determinar venueId desde match o reservation
    let VENUE_ID: string | null = null;
    if (TX.matchId !== null) {
      const MATCH_TX = TX as typeof TX & { match: { court: { venueId: string } } };
      VENUE_ID = MATCH_TX.match?.court?.venueId ?? null;
    } else if (TX.reservationId !== null) {
      const RES_TX = TX as typeof TX & { reservation: { court: { venueId: string } } };
      VENUE_ID = RES_TX.reservation?.court?.venueId ?? null;
    }

    if (VENUE_ID === null) {
      throw new AppError(
        'ENTIDAD_SIN_SEDE',
        'La transacción no tiene una sede asignada. No se puede confirmar el pago.',
        400,
      );
    }

    // Verificar que el usuario sea staff del venue
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

    // Confirmar la transacción
    const UPDATED = await this._prisma.transaction.update({
      where: { id: _input.transactionId },
      data: {
        status: 'CONFIRMED',
        confirmedAt: new Date(),
      },
    });

    const CONFIRMED_AT = UPDATED.confirmedAt;
    if (CONFIRMED_AT === null) {
      throw new AppError('ESTADO_INCONSISTENTE', 'No se pudo registrar la fecha de confirmacion.', 500);
    }

    // Si la transacción es de una reserva, actualizar paidAmountCents y paymentStatus
    if (TX.reservationId !== null) {
      await updateReservationPaymentFromTransactionRepo(TX.reservationId, this._prisma);
    }

    return {
      id: UPDATED.id,
      status: UPDATED.status,
      confirmedAt: CONFIRMED_AT.toISOString(),
    };
  }
}
