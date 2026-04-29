import type {
  TransactionReceiptCreateDTO,
  TransactionReceiptDTO,
  TransactionReceiptRepository,
} from '../../domain/ports/transaction_receipt_repository.js';

import { PRISMA } from '../prisma_client.js';

export class PrismaTransactionReceiptRepository implements TransactionReceiptRepository {
  async createSV(_data: TransactionReceiptCreateDTO): Promise<TransactionReceiptDTO> {
    return PRISMA.transactionReceipt.create({
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
    return PRISMA.transactionReceipt.findUnique({ where: { id: _receiptId } });
  }
}

