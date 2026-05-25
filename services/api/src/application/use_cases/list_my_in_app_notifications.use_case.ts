import { notificationContentForTypeSV } from '../../domain/notifications/notification_content.js';
import type { NotificationDeliveryRepository } from '../../domain/ports/notification_delivery_repository.js';

function resolveNotificationBodySV(
  _type: string,
  _payload: unknown,
  _fallback: string,
): string {
  if (_type !== 'CHAT_MESSAGE' || _payload === null || typeof _payload !== 'object') {
    return _fallback;
  }
  const P = _payload as Record<string, unknown>;
  const NAME =
    typeof P.senderDisplayName === 'string' && P.senderDisplayName.trim().length > 0
      ? P.senderDisplayName.trim()
      : null;
  const PREVIEW =
    typeof P.textPreview === 'string' && P.textPreview.trim().length > 0
      ? P.textPreview.trim()
      : null;
  if (NAME !== null && PREVIEW !== null) {
    return `${NAME}: ${PREVIEW}`;
  }
  if (PREVIEW !== null) {
    return PREVIEW;
  }
  return _fallback;
}

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
      type: string;
      title: string;
      body: string;
      deepLink: string | null;
      event: { type: string; matchId: string; categoryId: string; payload: unknown };
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
      items: RES.items.map((_n) => {
        const CONTENT = notificationContentForTypeSV(_n.event.type);
        const BODY = resolveNotificationBodySV(_n.event.type, _n.event.payload, CONTENT.body);
        return {
          deliveryId: _n.deliveryId,
          createdAt: _n.createdAt,
          sentAt: _n.sentAt,
          readAt: _n.readAt,
          type: _n.event.type,
          title: CONTENT.title,
          body: BODY,
          deepLink: `/matches/${_n.event.matchId}`,
          event: _n.event,
        };
      }),
      pageInfo: { page: PAGE, limit: LIMIT, total: RES.total },
    };
  }
}

