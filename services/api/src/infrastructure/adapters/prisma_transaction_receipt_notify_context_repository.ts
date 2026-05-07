import type {
  TransactionReceiptNotifyContextDTO,
  TransactionReceiptNotifyContextRepository,
} from '../../domain/ports/transaction_receipt_notify_context_repository.js';

import { PRISMA } from '../prisma_client.js';

export class PrismaTransactionReceiptNotifyContextRepository
  implements TransactionReceiptNotifyContextRepository
{
  async getForTransactionSV(_transactionId: string): Promise<TransactionReceiptNotifyContextDTO | null> {
    const ROW = await PRISMA.transaction.findUnique({
      where: { id: _transactionId },
      select: {
        userId: true,
        match: {
          select: {
            id: true,
            categoryId: true,
            organizerUserId: true,
          },
        },
      },
    });
    if (ROW === null) {
      return null;
    }
    return {
      matchId: ROW.match.id,
      categoryId: ROW.match.categoryId,
      organizerUserId: ROW.match.organizerUserId,
      payerUserId: ROW.userId,
    };
  }
}
