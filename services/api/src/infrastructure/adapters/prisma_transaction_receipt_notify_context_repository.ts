import type {
  TransactionReceiptNotifyContextDTO,
  TransactionReceiptNotifyContextRepository,
} from '../../domain/ports/transaction_receipt_notify_context_repository.js';

import type { PrismaClient } from '../../generated/prisma/client.js';

export class PrismaTransactionReceiptNotifyContextRepository
  implements TransactionReceiptNotifyContextRepository
{
  constructor(private readonly _prisma: PrismaClient) {}

  async getForTransactionSV(_transactionId: string): Promise<TransactionReceiptNotifyContextDTO | null> {
    const ROW = await this._prisma.transaction.findUnique({
      where: { id: _transactionId },
      select: {
        userId: true,
        match: {
          select: {
            id: true,
            categoryId: true,
            organizerUserId: true,
            court: {
              select: {
                venueId: true,
                venue: {
                  select: {
                    staff: { select: { userId: true } },
                  },
                },
              },
            },
          },
        },
      },
    });
    if (ROW === null || ROW.match === null) {
      // Límite conocido y aceptado (US-E8-05): las transacciones de solo-reserva sin `match`
      // asociado (matchId NOT NULL en NotificationEvent) no generan aviso al staff, igual que
      // ya ocurría con el aviso al organizador. No se modifica el schema Prisma en este change.
      return null;
    }

    const VENUE_ID = ROW.match.court?.venueId ?? null;
    const STAFF_USER_IDS = ROW.match.court?.venue.staff.map((_row) => _row.userId) ?? [];
    // Dedupe defensivo: `@@unique([venueId, userId])` ya lo garantiza en DB, pero un `Set`
    // evita depender de esa invariante si el select cambia en el futuro.
    const VENUE_STAFF_USER_IDS = [...new Set(STAFF_USER_IDS)];

    return {
      matchId: ROW.match.id,
      categoryId: ROW.match.categoryId,
      organizerUserId: ROW.match.organizerUserId,
      payerUserId: ROW.userId,
      venueId: VENUE_ID,
      venueStaffUserIds: VENUE_STAFF_USER_IDS,
    };
  }
}
