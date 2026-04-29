export type NotificationsDispatchTickSummaryDTO = {
  processedEvents: number;
  createdDeliveries: number;
  attemptedDeliveries: number;
  sentDeliveries: number;
  failedDeliveries: number;
  disabledTokens: number;
  backlogEvents: number;
  backlogDeliveries: number;
  elapsedMs: number;
};

export type NotificationsDispatchDeliveryOutcomeDTO = {
  eventId: string;
  deliveryId: string;
  attemptCount: number;
  status: 'SENT' | 'FAILED';
  provider: string;
  errorCode: string | null;
  elapsedMs: number;
};

export type NotificationsDispatchBatchOutcomeDTO = {
  eventId: string;
  provider: string;
  attemptedDeliveries: number;
  attemptedTokens: number;
  elapsedMs: number;
  failureCount: number;
};

export type NotificationsDispatchWarningDTO = {
  kind: 'BACKLOG_GROWING' | 'FAILURE_RATE_HIGH' | 'TICK_TIMEOUT' | 'OVERLAP_SKIPPED';
  backlogEvents?: number;
  backlogDeliveries?: number;
  failedDeliveries?: number;
  attemptedDeliveries?: number;
  tickElapsedMs?: number;
};

export interface NotificationsObservability {
  onTickCompletedSV(_summary: NotificationsDispatchTickSummaryDTO): void;
  onBatchCompletedSV(_batch: NotificationsDispatchBatchOutcomeDTO): void;
  onDeliveryOutcomeSV(_outcome: NotificationsDispatchDeliveryOutcomeDTO): void;
  onWarningSV(_warning: NotificationsDispatchWarningDTO): void;
}

export class NoopNotificationsObservability implements NotificationsObservability {
  onTickCompletedSV(): void {}
  onBatchCompletedSV(): void {}
  onDeliveryOutcomeSV(): void {}
  onWarningSV(): void {}
}

