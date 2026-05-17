import type { ReservationLedgerRepository } from '../../domain/ports/reservation_ledger_repository.js';
import type { AppendReservationLedgerEntryInput } from '../../domain/ports/reservation_ledger_repository.js';
import { PRISMA } from '../prisma_client.js';

export class PrismaReservationLedgerRepository implements ReservationLedgerRepository {
  async appendEntrySV(
    _input: AppendReservationLedgerEntryInput,
  ): Promise<{ id: string }> {
    const ROW = await PRISMA.reservationPaymentLedger.create({
      data: {
        reservationId: _input.reservationId,
        transactionId: _input.transactionId ?? null,
        entryType: _input.entryType,
        direction: _input.direction,
        amountMinor: _input.amountMinor,
        currencyCode: _input.currencyCode,
        amountBsMinor: _input.amountBsMinor ?? null,
        actorUserId: _input.actorUserId,
        reason: _input.reason ?? null,
      },
    });
    return { id: ROW.id };
  }
}
