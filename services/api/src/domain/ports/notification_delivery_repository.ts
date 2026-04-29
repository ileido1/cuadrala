export type NotificationDeliveryDTO = {
  id: string;
  eventId: string;
  userId: string;
  status: 'PENDING' | 'SENT' | 'FAILED' | 'SKIPPED';
  error: string | null;
  lastErrorCode: string | null;
  attemptCount: number;
  nextAttemptAt: Date | null;
  lastAttemptAt: Date | null;
  createdAt: Date;
  sentAt: Date | null;
  readAt: Date | null;
};

export type CreateNotificationDeliveryDTO = {
  eventId: string;
  userId: string;
  status: 'PENDING' | 'SENT' | 'FAILED' | 'SKIPPED';
  error: string | null;
  lastErrorCode?: string | null;
  attemptCount?: number;
  nextAttemptAt?: Date | null;
  lastAttemptAt?: Date | null;
  sentAt: Date | null;
};

export type DueNotificationDeliveryWithEventDTO = {
  deliveryId: string;
  eventId: string;
  userId: string;
  status: 'PENDING' | 'FAILED';
  attemptCount: number;
  nextAttemptAt: Date | null;
  event: { type: 'MATCH_SLOT_OPENED' | 'MATCH_CANCELLED'; matchId: string; categoryId: string };
};

export type InAppNotificationDTO = {
  deliveryId: string;
  eventId: string;
  userId: string;
  deliveryStatus: 'PENDING' | 'SENT' | 'FAILED' | 'SKIPPED';
  createdAt: Date;
  sentAt: Date | null;
  readAt: Date | null;
  event: { type: 'MATCH_SLOT_OPENED' | 'MATCH_CANCELLED'; matchId: string; categoryId: string; payload: unknown };
};

export interface NotificationDeliveryRepository {
  createManyIdempotentSV(
    _deliveries: CreateNotificationDeliveryDTO[],
  ): Promise<{ createdCount: number }>;

  listDueDeliveriesWithEventSV(_limit: number, _now: Date): Promise<DueNotificationDeliveryWithEventDTO[]>;

  countBacklogSV(_now: Date): Promise<number>;

  markSentSV(_deliveryId: string, _sentAt: Date): Promise<void>;

  markFailedSV(_dto: {
    deliveryId: string;
    error: string;
    errorCode: string | null;
    attemptCount: number;
    lastAttemptAt: Date;
    nextAttemptAt: Date | null;
  }): Promise<void>;

  countOutstandingByEventIdSV(_eventId: string, _now: Date): Promise<number>;

  listInAppByUserSV(_dto: {
    userId: string;
    status: 'unread' | 'all';
    page: number;
    limit: number;
  }): Promise<{ items: InAppNotificationDTO[]; total: number }>;

  markReadSV(_dto: { userId: string; deliveryId: string; readAt: Date }): Promise<boolean>;

  markReadAllSV(_dto: { userId: string; readAt: Date }): Promise<{ updatedCount: number }>;
}

