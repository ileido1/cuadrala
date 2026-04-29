import type { NotificationDeliveryRepository } from '../../domain/ports/notification_delivery_repository.js';

export class MarkAllMyInAppNotificationsReadUseCase {
  constructor(private readonly _notificationDeliveryRepository: NotificationDeliveryRepository) {}

  async executeSV(_actorUserId: string, _now: Date): Promise<{ updatedCount: number }> {
    return this._notificationDeliveryRepository.markReadAllSV({ userId: _actorUserId, readAt: _now });
  }
}

