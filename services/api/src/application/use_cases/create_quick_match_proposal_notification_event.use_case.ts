import type { NotificationDeliveryRepository } from '../../domain/ports/notification_delivery_repository.js';
import type { NotificationEventRepository } from '../../domain/ports/notification_event_repository.js';

export class CreateQuickMatchProposalNotificationEventUseCase {
  constructor(
    private readonly _notificationEventRepository: NotificationEventRepository,
    private readonly _notificationDeliveryRepository: NotificationDeliveryRepository,
  ) {}

  async executeSV(_dto: { quickMatchSearchId: string; categoryId: string; userIds: string[]; proposalType: string }): Promise<void> {
    const EVENT = await this._notificationEventRepository.createQuickMatchProposalSV({
      quickMatchSearchId: _dto.quickMatchSearchId,
      categoryId: _dto.categoryId,
      payload: { proposalType: _dto.proposalType },
    });
    await this._notificationDeliveryRepository.createManyIdempotentSV(
      [...new Set(_dto.userIds)].map((_userId) => ({ eventId: EVENT.id, userId: _userId, status: 'PENDING', error: null, sentAt: null })),
    );
  }
}
