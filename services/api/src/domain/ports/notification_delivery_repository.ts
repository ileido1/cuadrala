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
  event: { type: 'MATCH_SLOT_OPENED'; matchId: string; categoryId: string };
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
}

