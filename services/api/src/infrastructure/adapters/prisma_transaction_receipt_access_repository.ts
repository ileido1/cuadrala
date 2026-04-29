import type { TransactionReceiptAccessRepository } from '../../domain/ports/transaction_receipt_access_repository.js';

import { PRISMA } from '../prisma_client.js';

export class PrismaTransactionReceiptAccessRepository implements TransactionReceiptAccessRepository {
  async transactionExistsSV(_transactionId: string): Promise<boolean> {
    const ROW = await PRISMA.transaction.findUnique({
      where: { id: _transactionId },
      select: { id: true },
    });
    return ROW !== null;
  }

  async userCanAccessTransactionSV(_transactionId: string, _userId: string): Promise<boolean> {
    const ROW = await PRISMA.transaction.findUnique({
      where: { id: _transactionId },
      select: {
        id: true,
        userId: true,
        match: {
          select: {
            organizerUserId: true,
            participants: { where: { userId: _userId }, select: { id: true } },
          },
        },
      },
    });
    if (ROW === null) return false;
    if (ROW.userId === _userId) return true;
    if (ROW.match.organizerUserId === _userId) return true;
    return ROW.match.participants.length > 0;
  }
}

