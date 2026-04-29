import type {
  NotificationSubscriptionDTO,
  NotificationSubscriptionRepository,
} from '../../domain/ports/notification_subscription_repository.js';

export class ListMyNotificationSubscriptionsUseCase {
  constructor(private readonly _notificationSubscriptionRepository: NotificationSubscriptionRepository) {}

  async executeSV(_actorUserId: string): Promise<NotificationSubscriptionDTO[]> {
    return this._notificationSubscriptionRepository.listByUserIdSV(_actorUserId);
  }
}

