import type {
  CreateNotificationDeliveryDTO,
  DueNotificationDeliveryWithEventDTO,
  InAppNotificationDTO,
  NotificationDeliveryRepository,
} from '../../domain/ports/notification_delivery_repository.js';

import { PRISMA } from '../prisma_client.js';

export class PrismaNotificationDeliveryRepository implements NotificationDeliveryRepository {
  async createManyIdempotentSV(
    _deliveries: CreateNotificationDeliveryDTO[],
  ): Promise<{ createdCount: number }> {
    if (_deliveries.length === 0) {
      return { createdCount: 0 };
    }

    const RESULT = await PRISMA.notificationDelivery.createMany({
      data: _deliveries.map((_d) => ({
        eventId: _d.eventId,
        userId: _d.userId,
        status: _d.status,
        error: _d.error,
        lastErrorCode: _d.lastErrorCode ?? null,
        attemptCount: _d.attemptCount ?? 0,
        nextAttemptAt: _d.nextAttemptAt ?? null,
        lastAttemptAt: _d.lastAttemptAt ?? null,
        sentAt: _d.sentAt,
      })),
      skipDuplicates: true,
    });
    return { createdCount: RESULT.count };
  }

  async listDueDeliveriesWithEventSV(_limit: number, _now: Date): Promise<DueNotificationDeliveryWithEventDTO[]> {
    if (_limit <= 0) {
      return [];
    }

    const ROWS = await PRISMA.notificationDelivery.findMany({
      where: {
        OR: [
          { status: 'PENDING' },
          { status: 'FAILED', nextAttemptAt: { lte: _now } },
        ],
      },
      orderBy: { createdAt: 'asc' },
      take: _limit,
      select: {
        id: true,
        eventId: true,
        userId: true,
        status: true,
        attemptCount: true,
        nextAttemptAt: true,
        event: { select: { type: true, matchId: true, categoryId: true } },
      },
    });

    return ROWS.map((_r) => ({
      deliveryId: _r.id,
      eventId: _r.eventId,
      userId: _r.userId,
      status: _r.status as 'PENDING' | 'FAILED',
      attemptCount: _r.attemptCount,
      nextAttemptAt: _r.nextAttemptAt,
      event: {
        type: _r.event.type,
        matchId: _r.event.matchId,
        categoryId: _r.event.categoryId,
      },
    }));
  }

  async countBacklogSV(_now: Date): Promise<number> {
    return PRISMA.notificationDelivery.count({
      where: {
        OR: [{ status: 'PENDING' }, { status: 'FAILED', nextAttemptAt: { lte: _now } }],
      },
    });
  }

  async markSentSV(_deliveryId: string, _sentAt: Date): Promise<void> {
    await PRISMA.notificationDelivery.update({
      where: { id: _deliveryId },
      data: {
        status: 'SENT',
        sentAt: _sentAt,
        error: null,
        lastErrorCode: null,
        nextAttemptAt: null,
        lastAttemptAt: _sentAt,
      },
      select: { id: true },
    });
  }

  async markFailedSV(_dto: {
    deliveryId: string;
    error: string;
    errorCode: string | null;
    attemptCount: number;
    lastAttemptAt: Date;
    nextAttemptAt: Date | null;
  }): Promise<void> {
    await PRISMA.notificationDelivery.update({
      where: { id: _dto.deliveryId },
      data: {
        status: 'FAILED',
        sentAt: null,
        error: _dto.error,
        lastErrorCode: _dto.errorCode,
        attemptCount: _dto.attemptCount,
        lastAttemptAt: _dto.lastAttemptAt,
        nextAttemptAt: _dto.nextAttemptAt,
      },
      select: { id: true },
    });
  }

  async countOutstandingByEventIdSV(_eventId: string, _now: Date): Promise<number> {
    // _now se mantiene por compatibilidad futura (p.ej. filtros por nextAttemptAt<=now).
    void _now;
    return PRISMA.notificationDelivery.count({
      where: {
        eventId: _eventId,
        OR: [{ status: 'PENDING' }, { status: 'FAILED', nextAttemptAt: { not: null } }],
      },
    });
  }

  async listInAppByUserSV(_dto: {
    userId: string;
    status: 'unread' | 'all';
    page: number;
    limit: number;
  }): Promise<{ items: InAppNotificationDTO[]; total: number }> {
    const PAGE = Number.isFinite(_dto.page) ? _dto.page : 1;
    const LIMIT = Number.isFinite(_dto.limit) ? _dto.limit : 20;
    const SKIP = (Math.max(1, PAGE) - 1) * Math.max(1, LIMIT);

    const WHERE: Parameters<typeof PRISMA.notificationDelivery.count>[0]['where'] = { userId: _dto.userId };
    if (_dto.status === 'unread') {
      WHERE.readAt = null;
    }

    const [TOTAL, ROWS] = await Promise.all([
      PRISMA.notificationDelivery.count({ where: WHERE }),
      PRISMA.notificationDelivery.findMany({
        where: WHERE,
        orderBy: { createdAt: 'desc' },
        skip: SKIP,
        take: LIMIT,
        select: {
          id: true,
          eventId: true,
          userId: true,
          status: true,
          createdAt: true,
          sentAt: true,
          readAt: true,
          event: { select: { type: true, matchId: true, categoryId: true, payload: true } },
        },
      }),
    ]);

    return {
      total: TOTAL,
      items: ROWS.map((_r) => ({
        deliveryId: _r.id,
        eventId: _r.eventId,
        userId: _r.userId,
        deliveryStatus: _r.status,
        createdAt: _r.createdAt,
        sentAt: _r.sentAt,
        readAt: _r.readAt,
        event: {
          type: _r.event.type,
          matchId: _r.event.matchId,
          categoryId: _r.event.categoryId,
          payload: _r.event.payload as unknown,
        },
      })),
    };
  }

  async markReadSV(_dto: { userId: string; deliveryId: string; readAt: Date }): Promise<boolean> {
    const RES = await PRISMA.notificationDelivery.updateMany({
      where: { id: _dto.deliveryId, userId: _dto.userId },
      data: { readAt: _dto.readAt },
    });
    return RES.count > 0;
  }

  async markReadAllSV(_dto: { userId: string; readAt: Date }): Promise<{ updatedCount: number }> {
    const RES = await PRISMA.notificationDelivery.updateMany({
      where: { userId: _dto.userId, readAt: null },
      data: { readAt: _dto.readAt },
    });
    return { updatedCount: RES.count };
  }
}

