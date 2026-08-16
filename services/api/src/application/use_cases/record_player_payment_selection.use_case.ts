import { AppError } from '../../domain/errors/app_error.js';
import type { PaymentTransactionRepository } from '../../domain/ports/payment_transaction_repository.js';
import type { TransactionReceiptAccessRepository } from '../../domain/ports/transaction_receipt_access_repository.js';
import type {
  TransactionReceiptNotifyContextDTO,
  TransactionReceiptNotifyContextRepository,
} from '../../domain/ports/transaction_receipt_notify_context_repository.js';
import type { CreatePaymentPendingNotificationEventUseCase } from './create_payment_pending_notification_event.use_case.js';

/**
 * Resuelve los destinatarios de staff a notificar, excluyendo:
 * - al propio pagador (self-notify skip, D1/REQ-VSN-002)
 * - al organizador, solo si ya recibió el evento (a) por ser distinto del pagador
 */
function resolveStaffRecipientsSV(_ctx: TransactionReceiptNotifyContextDTO): string[] {
  const ORGANIZER_ALREADY_NOTIFIED = _ctx.payerUserId !== _ctx.organizerUserId;
  return _ctx.venueStaffUserIds.filter((_userId) => {
    if (_userId === _ctx.payerUserId) {
      return false;
    }
    if (ORGANIZER_ALREADY_NOTIFIED && _userId === _ctx.organizerUserId) {
      return false;
    }
    return true;
  });
}

function mapRecordSelectionErrorSV(_error: unknown): never {
  if (_error instanceof AppError) {
    throw _error;
  }
  if (_error instanceof Error) {
    switch (_error.message) {
      case 'TRANSACCION_NO_ENCONTRADA':
        throw new AppError(
          'TRANSACCION_NO_ENCONTRADA',
          'La transacción indicada no existe.',
          404,
        );
      case 'NO_AUTORIZADO':
        throw new AppError('NO_AUTORIZADO', 'No tenés permiso para esta transacción.', 403);
      case 'TRANSACCION_NO_PENDIENTE':
        throw new AppError(
          'TRANSACCION_NO_PENDIENTE',
          'Solo se puede registrar el medio de pago en transacciones pendientes.',
          400,
        );
      case 'MEDIO_PAGO_NO_ENCONTRADO':
        throw new AppError(
          'MEDIO_PAGO_NO_ENCONTRADO',
          'El medio de pago indicado no existe.',
          404,
        );
      case 'SELECCION_PAGO_REQUERIDA':
        throw new AppError(
          'VALIDACION_FALLIDA',
          'Indicá el medio de pago seleccionado.',
          400,
        );
      default:
        break;
    }
  }
  throw new AppError(
    'ERROR_INTERNO',
    'No se pudo registrar el medio de pago.',
    500,
  );
}

export class RecordPlayerPaymentSelectionUseCase {
  constructor(
    private readonly _transactionRepository: PaymentTransactionRepository,
    private readonly _receiptAccessRepository: TransactionReceiptAccessRepository,
    private readonly _notifyContextRepository: TransactionReceiptNotifyContextRepository | null = null,
    private readonly _createPaymentPendingNotificationEvent: CreatePaymentPendingNotificationEventUseCase | null = null,
  ) {}

  async executeSV(_input: {
    transactionId: string;
    actorUserId: string;
    venuePaymentMethodId?: string | undefined;
    paymentMethodType?: string | undefined;
    reportedSettlement?: { amountMinor: bigint; currencyCode: string } | undefined;
  }): Promise<{ recorded: true }> {
    const CAN_ACCESS = await this._receiptAccessRepository.userCanAccessTransactionSV(
      _input.transactionId,
      _input.actorUserId,
    );
    if (!CAN_ACCESS) {
      throw new AppError(
        'NO_AUTORIZADO',
        'No tenés permiso para registrar el pago de esta transacción.',
        403,
      );
    }

    try {
      await this._transactionRepository.recordPlayerPaymentSelectionSV({
        transactionId: _input.transactionId,
        actorUserId: _input.actorUserId,
        venuePaymentMethodId: _input.venuePaymentMethodId,
        paymentMethodType: _input.paymentMethodType,
        reportedSettlement: _input.reportedSettlement,
      });
    } catch (_error) {
      mapRecordSelectionErrorSV(_error);
    }

    await this._notifyOrganizerOfSelectionSV({
      transactionId: _input.transactionId,
      actorUserId: _input.actorUserId,
    });

    return { recorded: true };
  }

  private async _notifyOrganizerOfSelectionSV(_input: {
    transactionId: string;
    actorUserId: string;
  }): Promise<void> {
    if (
      this._notifyContextRepository === null
      || this._createPaymentPendingNotificationEvent === null
    ) {
      return;
    }

    //? 1. Cargar el contexto de notificación una sola vez (sede + organizador + staff)
    let CTX: TransactionReceiptNotifyContextDTO | null;
    try {
      CTX = await this._notifyContextRepository.getForTransactionSV(_input.transactionId);
    } catch {
      // No bloquear el registro si falla la resolución del contexto de notificación.
      return;
    }
    if (CTX === null) {
      return;
    }

    //? 2. (a) Aviso al organizador — comportamiento existente, sin cambios (A3/REQ-VSN-004)
    if (CTX.payerUserId === _input.actorUserId && CTX.payerUserId !== CTX.organizerUserId) {
      try {
        await this._createPaymentPendingNotificationEvent.executeSV({
          matchId: CTX.matchId,
          categoryId: CTX.categoryId,
          userIds: [CTX.organizerUserId],
          payload: {
            kind: 'PAYMENT_METHOD_SELECTED',
            transactionId: _input.transactionId,
            payerUserId: CTX.payerUserId,
          },
        });
      } catch {
        // No bloquear el registro si falla la notificación al organizador.
      }
    }

    //? 3. (b) Aviso al staff de la sede — adición (US-E8-05), en su propio try/catch (A4)
    const STAFF_RECIPIENTS = resolveStaffRecipientsSV(CTX);
    if (CTX.venueId !== null && STAFF_RECIPIENTS.length > 0) {
      try {
        await this._createPaymentPendingNotificationEvent.executeSV({
          matchId: CTX.matchId,
          categoryId: CTX.categoryId,
          userIds: STAFF_RECIPIENTS,
          payload: {
            kind: 'VENUE_PAYMENT_PENDING',
            venueId: CTX.venueId,
            transactionId: _input.transactionId,
            payerUserId: CTX.payerUserId,
          },
        });
      } catch {
        // No bloquear el registro si falla la notificación al staff.
      }
    }
  }
}
