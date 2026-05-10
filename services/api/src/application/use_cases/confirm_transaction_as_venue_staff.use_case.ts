import type { PrismaClient } from '../../generated/prisma/client.js';

import { AppError } from '../../domain/errors/app_error.js';
import type { VenueStaffRepository } from '../../domain/ports/venue_staff_repository.js';
import { findTransactionWithVenueRepo } from '../../infrastructure/repositories/transaction.repository.js';

export class ConfirmTransactionAsVenueStaffUseCase {
  constructor(
    private readonly _venueStaffRepository: VenueStaffRepository,
    private readonly _prisma: PrismaClient,
  ) {}

  async executeSV(_input: {
    transactionId: string;
    userId: string;
  }): Promise<{ id: string; status: string; confirmedAt: string }> {
    const TX = await findTransactionWithVenueRepo(_input.transactionId);
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

    // Verificar que el partido tenga cancha asignada
    const VENUE_ID = TX.match?.court?.venueId;
    if (VENUE_ID === undefined || VENUE_ID === null) {
      throw new AppError(
        'PARTIDO_SIN_SEDE',
        'El partido no tiene una sede asignada. No se puede confirmar el pago.',
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
        'Solo el staff de la sede puede confirmar pagos de esta partida.',
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

    return {
      id: UPDATED.id,
      status: UPDATED.status,
      confirmedAt: CONFIRMED_AT.toISOString(),
    };
  }
}
