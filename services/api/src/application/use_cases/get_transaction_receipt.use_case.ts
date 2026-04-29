import { AppError } from '../../domain/errors/app_error.js';
import type { ReceiptStorage } from '../../domain/ports/receipt_storage.js';
import type { TransactionReceiptAccessRepository } from '../../domain/ports/transaction_receipt_access_repository.js';
import type { TransactionReceiptRepository } from '../../domain/ports/transaction_receipt_repository.js';

export class GetTransactionReceiptUseCase {
  constructor(
    private readonly _receiptStorage: ReceiptStorage,
    private readonly _transactionReceiptRepository: TransactionReceiptRepository,
    private readonly _receiptAccessRepository: TransactionReceiptAccessRepository,
  ) {}

  async executeSV(_input: {
    transactionId: string;
    receiptId: string;
    actorUserId: string;
  }): Promise<{ mimeType: string; sizeBytes: number; content: Buffer }> {
    const CAN_ACCESS = await this._receiptAccessRepository.userCanAccessTransactionSV(
      _input.transactionId,
      _input.actorUserId,
    );
    if (!CAN_ACCESS) {
      throw new AppError('NO_AUTORIZADO', 'No tienes permisos para ver comprobantes de esta transacción.', 403);
    }

    const RECEIPT = await this._transactionReceiptRepository.findByIdSV(_input.receiptId);
    if (RECEIPT === null || RECEIPT.transactionId !== _input.transactionId) {
      throw new AppError('COMPROBANTE_NO_ENCONTRADO', 'El comprobante indicado no existe.', 404);
    }

    const STORED = await this._receiptStorage.getSV(RECEIPT.storageKey);
    if (STORED === null) {
      throw new AppError('COMPROBANTE_NO_ENCONTRADO', 'El comprobante indicado no existe.', 404);
    }

    return { mimeType: STORED.mimeType, sizeBytes: STORED.sizeBytes, content: STORED.content };
  }
}

