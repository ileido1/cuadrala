import type {
  CreateMatchCancelledEventDTO,
  CreateMatchSlotOpenedEventDTO,
  NotificationEventDTO,
  NotificationEventRepository,
} from '../../domain/ports/notification_event_repository.js';

import { PRISMA } from '../prisma_client.js';

export class PrismaNotificationEventRepository implements NotificationEventRepository {
  async createMatchSlotOpenedSV(_dto: CreateMatchSlotOpenedEventDTO): Promise<NotificationEventDTO> {
    return PRISMA.notificationEvent.create({
      data: {
        type: 'MATCH_SLOT_OPENED',
        matchId: _dto.matchId,
        categoryId: _dto.categoryId,
        payload: _dto.payload as never,
      },
    });
  }

  async createMatchCancelledSV(_dto: CreateMatchCancelledEventDTO): Promise<NotificationEventDTO> {
    return PRISMA.notificationEvent.create({
      data: {
        type: 'MATCH_CANCELLED',
        matchId: _dto.matchId,
        categoryId: _dto.categoryId,
        payload: _dto.payload as never,
      },
    });
  }

  async listPendingSV(_limit: number): Promise<NotificationEventDTO[]> {
    return PRISMA.notificationEvent.findMany({
      where: { processedAt: null },
      orderBy: { createdAt: 'asc' },
      take: _limit,
    });
  }

  async countPendingSV(): Promise<number> {
    return PRISMA.notificationEvent.count({ where: { processedAt: null } });
  }

  async markProcessedSV(_eventId: string, _processedAt: Date): Promise<void> {
    await PRISMA.notificationEvent.update({
      where: { id: _eventId },
      data: { processedAt: _processedAt },
      select: { id: true },
    });
  }
}

