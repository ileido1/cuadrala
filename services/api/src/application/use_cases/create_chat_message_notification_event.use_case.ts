import type { NotificationDeliveryRepository } from '../../domain/ports/notification_delivery_repository.js';
import type { NotificationEventRepository } from '../../domain/ports/notification_event_repository.js';

export class CreateChatMessageNotificationEventUseCase {
  constructor(
    private readonly _notificationEventRepository: NotificationEventRepository,
    private readonly _notificationDeliveryRepository: NotificationDeliveryRepository,
  ) {}

  async executeSV(_dto: {
    matchId: string;
    categoryId: string;
    payload: unknown;
    userIds: string[];
  }): Promise<{ eventId: string; createdDeliveries: number }> {
    const EVENT = await this._notificationEventRepository.createChatMessageSV({
      matchId: _dto.matchId,
      categoryId: _dto.categoryId,
      payload: _dto.payload,
    });

    const CREATED = await this._notificationDeliveryRepository.createManyIdempotentSV(
      _dto.userIds.map((_userId) => ({
        eventId: EVENT.id,
        userId: _userId,
        status: 'PENDING',
        error: null,
        sentAt: null,
      })),
    );

    return { eventId: EVENT.id, createdDeliveries: CREATED.createdCount };
  }
}

