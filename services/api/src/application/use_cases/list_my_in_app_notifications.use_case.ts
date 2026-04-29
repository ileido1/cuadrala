import type { NotificationDeliveryRepository } from '../../domain/ports/notification_delivery_repository.js';

export class ListMyInAppNotificationsUseCase {
  constructor(private readonly _notificationDeliveryRepository: NotificationDeliveryRepository) {}

  async executeSV(_dto: {
    actorUserId: string;
    status: 'unread' | 'all';
    page: number;
    limit: number;
  }): Promise<{
    items: Array<{
      deliveryId: string;
      createdAt: Date;
      sentAt: Date | null;
      readAt: Date | null;
      event: { type: 'MATCH_SLOT_OPENED' | 'MATCH_CANCELLED'; matchId: string; categoryId: string; payload: unknown };
    }>;
    pageInfo: { page: number; limit: number; total: number };
  }> {
    const PAGE = Math.max(1, _dto.page);
    const LIMIT = Math.min(100, Math.max(1, _dto.limit));

    const RES = await this._notificationDeliveryRepository.listInAppByUserSV({
      userId: _dto.actorUserId,
      status: _dto.status,
      page: PAGE,
      limit: LIMIT,
    });

    return {
      items: RES.items.map((_n) => ({
        deliveryId: _n.deliveryId,
        createdAt: _n.createdAt,
        sentAt: _n.sentAt,
        readAt: _n.readAt,
        event: _n.event,
      })),
      pageInfo: { page: PAGE, limit: LIMIT, total: RES.total },
    };
  }
}

