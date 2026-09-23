import type { NotificationDeliveryRepository } from '../../domain/ports/notification_delivery_repository.js';
import type { NotificationSubscriptionRepository } from '../../domain/ports/notification_subscription_repository.js';
import type { NotificationEventRepository } from '../../domain/ports/notification_event_repository.js';

export class CreateQuickMatchProposalNotificationEventUseCase {
  constructor(
    private readonly _notificationEventRepository: NotificationEventRepository,
    private readonly _notificationDeliveryRepository: NotificationDeliveryRepository,
    private readonly _notificationSubscriptionRepository: NotificationSubscriptionRepository,
  ) {}

  async executeSV(_dto: { quickMatchSearchId: string; categoryId: string; userIds: string[]; proposalType: string }): Promise<void> {
    const USER_IDS = await this._notificationSubscriptionRepository.filterEnabledUserIdsForEventSV([...new Set(_dto.userIds)], 'QUICK_MATCH_PROPOSAL');
    if (USER_IDS.length === 0) return;
    const EVENT = await this._notificationEventRepository.createQuickMatchProposalSV({
      quickMatchSearchId: _dto.quickMatchSearchId,
      categoryId: _dto.categoryId,
      payload: { proposalType: _dto.proposalType },
    });
    await this._notificationDeliveryRepository.createManyIdempotentSV(
      USER_IDS.map((_userId) => ({ eventId: EVENT.id, userId: _userId, status: 'PENDING', error: null, sentAt: null })),
    );
  }
}
