import type {
  NotificationRecipientDTO,
  NotificationSubscriptionDTO,
  NotificationSubscriptionRecipientFilterDTO,
  NotificationSubscriptionRepository,
  UpsertNotificationSubscriptionDTO,
} from '../../domain/ports/notification_subscription_repository.js';

import { PRISMA } from '../prisma_client.js';

function degreesFromKmLatSV(_radiusKm: number): number {
  return _radiusKm / 110.574;
}

function degreesFromKmLngSV(_radiusKm: number, _lat: number): number {
  const LAT_RAD = (_lat * Math.PI) / 180;
  const KM_PER_DEG = 111.32 * Math.cos(LAT_RAD);
  if (KM_PER_DEG <= 0) {
    return 180;
  }
  return _radiusKm / KM_PER_DEG;
}

export class PrismaNotificationSubscriptionRepository
  implements NotificationSubscriptionRepository
{
  async upsertSV(_dto: UpsertNotificationSubscriptionDTO): Promise<NotificationSubscriptionDTO> {
    if (_dto.id !== undefined) {
      const UPDATED = await PRISMA.notificationSubscription.updateMany({
        where: { id: _dto.id, userId: _dto.userId },
        data: {
          categoryId: _dto.categoryId,
          nearLat: _dto.nearLat,
          nearLng: _dto.nearLng,
          radiusKm: _dto.radiusKm,
          enabled: _dto.enabled,
          enabledTypes: _dto.enabledTypes as never,
        },
      });
      if (UPDATED.count === 0) {
        throw new Error('SUBSCRIPCION_NO_ENCONTRADA');
      }
      const ROW = await PRISMA.notificationSubscription.findUnique({ where: { id: _dto.id } });
      if (ROW === null) {
        throw new Error('SUBSCRIPCION_NO_ENCONTRADA');
      }
      return ROW;
    }

    const CREATED = await PRISMA.notificationSubscription.create({
      data: {
        userId: _dto.userId,
        categoryId: _dto.categoryId,
        nearLat: _dto.nearLat,
        nearLng: _dto.nearLng,
        radiusKm: _dto.radiusKm,
        enabled: _dto.enabled,
        enabledTypes: (_dto.enabledTypes ?? null) as never,
      },
    });
    return CREATED;
  }

  async listByUserIdSV(_userId: string): Promise<NotificationSubscriptionDTO[]> {
    return PRISMA.notificationSubscription.findMany({
      where: { userId: _userId },
      orderBy: { createdAt: 'desc' },
    });
  }

  async disableByIdForUserSV(_id: string, _userId: string): Promise<boolean> {
    const UPDATED = await PRISMA.notificationSubscription.updateMany({
      where: { id: _id, userId: _userId },
      data: { enabled: false },
    });
    return UPDATED.count > 0;
  }

  async findRecipientsForEventSV(
    _filter: NotificationSubscriptionRecipientFilterDTO,
  ): Promise<NotificationRecipientDTO[]> {
    const ROWS = await PRISMA.notificationSubscription.findMany({
      where: {
        enabled: true,
        userId: { notIn: _filter.excludeUserIds },
        OR: [{ categoryId: null }, { categoryId: _filter.categoryId }],
      },
      select: { id: true, userId: true, nearLat: true, nearLng: true, radiusKm: true, enabledTypes: true },
    });

    return ROWS.filter((_s) => {
      if (_s.enabledTypes !== null && typeof _s.enabledTypes === 'object') {
        const FLAGS = _s.enabledTypes as Record<string, unknown>;
        const FLAG = FLAGS[_filter.eventType];
        if (FLAG === false) {
          return false;
        }
      }

      if (_s.nearLat === null || _s.nearLng === null || _s.radiusKm === null) {
        return true;
      }

      const DELTA_LAT = degreesFromKmLatSV(_s.radiusKm);
      const DELTA_LNG = degreesFromKmLngSV(_s.radiusKm, _s.nearLat);
      const MIN_LAT = _s.nearLat - DELTA_LAT;
      const MAX_LAT = _s.nearLat + DELTA_LAT;
      const MIN_LNG = _s.nearLng - DELTA_LNG;
      const MAX_LNG = _s.nearLng + DELTA_LNG;

      return (
        _filter.matchLat >= MIN_LAT &&
        _filter.matchLat <= MAX_LAT &&
        _filter.matchLng >= MIN_LNG &&
        _filter.matchLng <= MAX_LNG
      );
    }).map((_s) => ({ userId: _s.userId, subscriptionId: _s.id }));
  }
}

