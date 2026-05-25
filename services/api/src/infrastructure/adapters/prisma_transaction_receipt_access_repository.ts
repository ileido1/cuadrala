import type { TransactionReceiptAccessRepository } from '../../domain/ports/transaction_receipt_access_repository.js';

import type { PrismaClient } from '../../generated/prisma/client.js';

export class PrismaTransactionReceiptAccessRepository implements TransactionReceiptAccessRepository {
  constructor(private readonly _prisma: PrismaClient) {}

  async transactionExistsSV(_transactionId: string): Promise<boolean> {
    const ROW = await this._prisma.transaction.findUnique({
      where: { id: _transactionId },
      select: { id: true },
    });
    return ROW !== null;
  }

  async userCanAccessTransactionSV(_transactionId: string, _userId: string): Promise<boolean> {
    const ROW = await this._prisma.transaction.findUnique({
      where: { id: _transactionId },
      select: {
        id: true,
        userId: true,
        match: {
          select: {
            organizerUserId: true,
            court: { select: { venueId: true } },
            participants: { where: { userId: _userId }, select: { id: true } },
          },
        },
        reservation: {
          select: {
            venueId: true,
            court: { select: { venueId: true } },
          },
        },
      },
    });
    if (ROW === null) return false;

    const VENUE_ID =
      ROW.reservation?.venueId ??
      ROW.reservation?.court?.venueId ??
      ROW.match?.court?.venueId;
    if (VENUE_ID !== undefined) {
      const STAFF = await this._prisma.venueStaff.findFirst({
        where: { venueId: VENUE_ID, userId: _userId },
        select: { id: true },
      });
      if (STAFF !== null) return true;
    }

    if (ROW.userId === _userId) return true;
    if (ROW.match === null) return false;
    if (ROW.match.organizerUserId === _userId) return true;
    return ROW.match.participants.length > 0;
  }

  async getPlayerPaymentMethodTypeSV(_transactionId: string): Promise<string | null> {
    const ROW = await this._prisma.transaction.findUnique({
      where: { id: _transactionId },
      select: {
        venuePaymentMethod: { select: { type: true } },
        paymentData: true,
      },
    });
    if (ROW === null) {
      return null;
    }
    if (ROW.venuePaymentMethod?.type !== undefined) {
      return ROW.venuePaymentMethod.type;
    }
    const DATA = ROW.paymentData;
    if (DATA !== null && typeof DATA === 'object' && !Array.isArray(DATA)) {
      const SELECTION = (DATA as Record<string, unknown>).playerSelection;
      if (SELECTION !== null && typeof SELECTION === 'object' && !Array.isArray(SELECTION)) {
        const TYPE = (SELECTION as Record<string, unknown>).type;
        if (typeof TYPE === 'string' && TYPE.length > 0) {
          return TYPE;
        }
      }
    }
    return null;
  }
}

