import { AppError } from '../../domain/errors/app_error.js';
import type { NotificationDeliveryRepository } from '../../domain/ports/notification_delivery_repository.js';

export class MarkMyInAppNotificationReadUseCase {
  constructor(private readonly _notificationDeliveryRepository: NotificationDeliveryRepository) {}

  async executeSV(_actorUserId: string, _deliveryId: string, _now: Date): Promise<void> {
    const UPDATED = await this._notificationDeliveryRepository.markReadSV({
      userId: _actorUserId,
      deliveryId: _deliveryId,
      readAt: _now,
    });
    if (!UPDATED) {
      throw new AppError('RECURSO_NO_ENCONTRADO', 'La notificación indicada no existe.', 404);
    }
  }
}

