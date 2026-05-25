import { randomUUID } from 'node:crypto';

import { AppError } from '../../domain/errors/app_error.js';
import type { ReceiptStorage } from '../../domain/ports/receipt_storage.js';
import type { TransactionReceiptAccessRepository } from '../../domain/ports/transaction_receipt_access_repository.js';
import type { TransactionReceiptNotifyContextRepository } from '../../domain/ports/transaction_receipt_notify_context_repository.js';
import type { TransactionReceiptRepository } from '../../domain/ports/transaction_receipt_repository.js';
import type { CreatePaymentPendingNotificationEventUseCase } from './create_payment_pending_notification_event.use_case.js';

const MAX_SIZE_BYTES = 5 * 1024 * 1024;
const ALLOWED_MIME_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp']);

export class UploadTransactionReceiptUseCase {
  constructor(
    private readonly _receiptStorage: ReceiptStorage,
    private readonly _transactionReceiptRepository: TransactionReceiptRepository,
    private readonly _receiptAccessRepository: TransactionReceiptAccessRepository,
    private readonly _notifyContextRepository: TransactionReceiptNotifyContextRepository | null = null,
    private readonly _createPaymentPendingNotificationEvent: CreatePaymentPendingNotificationEventUseCase | null = null,
  ) {}

  async executeSV(_input: {
    transactionId: string;
    actorUserId: string;
    mimeType: string;
    sizeBytes: number;
    originalFileName?: string;
    content: Buffer;
  }): Promise<{
    receipt: {
      id: string;
      transactionId: string;
      uploaderUserId: string;
      mimeType: string;
      sizeBytes: number;
      createdAt: string;
    };
  }> {
    if (!ALLOWED_MIME_TYPES.has(_input.mimeType)) {
      throw new AppError('VALIDACION_FALLIDA', 'Tipo de archivo no permitido. Solo jpeg/png/webp.', 400);
    }
    if (!Number.isFinite(_input.sizeBytes) || _input.sizeBytes <= 0) {
      throw new AppError('VALIDACION_FALLIDA', 'El archivo es inválido.', 400);
    }
    if (_input.sizeBytes > MAX_SIZE_BYTES) {
      throw new AppError('VALIDACION_FALLIDA', 'El archivo excede el tamaño máximo permitido (5MB).', 400);
    }

    const EXISTS = await this._receiptAccessRepository.transactionExistsSV(_input.transactionId);
    if (!EXISTS) {
      throw new AppError('TRANSACCION_NO_ENCONTRADA', 'La transacción indicada no existe.', 404);
    }

    const CAN_ACCESS = await this._receiptAccessRepository.userCanAccessTransactionSV(
      _input.transactionId,
      _input.actorUserId,
    );
    if (!CAN_ACCESS) {
      throw new AppError('NO_AUTORIZADO', 'No tienes permisos para adjuntar comprobantes a esta transacción.', 403);
    }

    const METHOD_TYPE = await this._receiptAccessRepository.getPlayerPaymentMethodTypeSV(
      _input.transactionId,
    );
    if (METHOD_TYPE === 'CASH') {
      throw new AppError(
        'VALIDACION_FALLIDA',
        'El pago en efectivo no requiere comprobante. Espera la confirmación del club.',
        400,
      );
    }

    const RECEIPT_ID = randomUUID();
    let storageKey: string;
    try {
      const STORED = await this._receiptStorage.putSV({
        transactionId: _input.transactionId,
        receiptId: RECEIPT_ID,
        mimeType: _input.mimeType,
        sizeBytes: _input.sizeBytes,
        originalFileName: _input.originalFileName,
        content: _input.content,
      });
      storageKey = STORED.storageKey;
    } catch (_error) {
      if (_error instanceof Error && _error.message === 'MIME_TYPE_NOT_ALLOWED') {
        throw new AppError('VALIDACION_FALLIDA', 'Tipo de archivo no permitido. Solo jpeg/png/webp.', 400);
      }
      throw _error;
    }

    const CREATED = await this._transactionReceiptRepository.createSV({
      id: RECEIPT_ID,
      transactionId: _input.transactionId,
      uploaderUserId: _input.actorUserId,
      mimeType: _input.mimeType,
      sizeBytes: _input.sizeBytes,
      storageKey,
    });

    await this._notifyOrganizerOfReceiptSV({
      transactionId: _input.transactionId,
      receiptId: CREATED.id,
      uploaderUserId: _input.actorUserId,
    });

    return {
      receipt: {
        id: CREATED.id,
        transactionId: CREATED.transactionId,
        uploaderUserId: CREATED.uploaderUserId,
        mimeType: CREATED.mimeType,
        sizeBytes: CREATED.sizeBytes,
        createdAt: CREATED.createdAt.toISOString(),
      },
    };
  }

  private async _notifyOrganizerOfReceiptSV(_input: {
    transactionId: string;
    receiptId: string;
    uploaderUserId: string;
  }): Promise<void> {
    if (this._notifyContextRepository === null || this._createPaymentPendingNotificationEvent === null) {
      return;
    }
    const CTX = await this._notifyContextRepository.getForTransactionSV(_input.transactionId);
    if (CTX === null) {
      return;
    }
    if (CTX.payerUserId !== _input.uploaderUserId) {
      return;
    }
    if (CTX.payerUserId === CTX.organizerUserId) {
      return;
    }
    try {
      await this._createPaymentPendingNotificationEvent.executeSV({
        matchId: CTX.matchId,
        categoryId: CTX.categoryId,
        userIds: [CTX.organizerUserId],
        payload: {
          kind: 'RECEIPT_UPLOADED',
          transactionId: _input.transactionId,
          receiptId: _input.receiptId,
          payerUserId: CTX.payerUserId,
        },
      });
    } catch {
      // No bloquear el upload si falla el evento de notificación.
    }
  }
}

