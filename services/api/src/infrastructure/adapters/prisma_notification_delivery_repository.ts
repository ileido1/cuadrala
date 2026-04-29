import type {
  CreateNotificationDeliveryDTO,
  DueNotificationDeliveryWithEventDTO,
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
}

