import type {
  TransactionReceiptCreateDTO,
  TransactionReceiptDTO,
  TransactionReceiptRepository,
} from '../../domain/ports/transaction_receipt_repository.js';

import type { PrismaClient } from '../../generated/prisma/client.js';

export class PrismaTransactionReceiptRepository implements TransactionReceiptRepository {
  constructor(private readonly _prisma: PrismaClient) {}

  async createSV(_data: TransactionReceiptCreateDTO): Promise<TransactionReceiptDTO> {
    return this._prisma.transactionReceipt.create({
      data: {
        id: _data.id,
        transactionId: _data.transactionId,
        uploaderUserId: _data.uploaderUserId,
        mimeType: _data.mimeType,
        sizeBytes: _data.sizeBytes,
        storageKey: _data.storageKey,
      },
    });
  }

  async findByIdSV(_receiptId: string): Promise<TransactionReceiptDTO | null> {
    return this._prisma.transactionReceipt.findUnique({ where: { id: _receiptId } });
  }
}

