import type {
  NotificationsDispatchBatchOutcomeDTO,
  NotificationsDispatchDeliveryOutcomeDTO,
  NotificationsDispatchTickSummaryDTO,
  NotificationsDispatchWarningDTO,
  NotificationsObservability,
} from '../../domain/ports/notifications_observability.js';

export type NotificationsMetricsSnapshotDTO = {
  eventsProcessed: number;
  deliveriesSent: number;
  deliveriesFailed: number;
  deliveriesRetried: number;
  disabledTokens: number;
  backlogEvents: number;
  backlogDeliveries: number;
  lastTickElapsedMs: number | null;
  lastTickAt: string | null;
  warningsTotal: number;
};

type MutableMetricsStateDTO = {
  eventsProcessed: number;
  deliveriesSent: number;
  deliveriesFailed: number;
  deliveriesRetried: number;
  disabledTokens: number;
  backlogEvents: number;
  backlogDeliveries: number;
  lastTickElapsedMs: number | null;
  lastTickAt: string | null;
  warningsTotal: number;
};

export class InMemoryNotificationsMetrics {
  private _state: MutableMetricsStateDTO = {
    eventsProcessed: 0,
    deliveriesSent: 0,
    deliveriesFailed: 0,
    deliveriesRetried: 0,
    disabledTokens: 0,
    backlogEvents: 0,
    backlogDeliveries: 0,
    lastTickElapsedMs: null,
    lastTickAt: null,
    warningsTotal: 0,
  };

  snapshotSV(): NotificationsMetricsSnapshotDTO {
    return { ...this._state };
  }

  resetSV(): void {
    this._state = {
      eventsProcessed: 0,
      deliveriesSent: 0,
      deliveriesFailed: 0,
      deliveriesRetried: 0,
      disabledTokens: 0,
      backlogEvents: 0,
      backlogDeliveries: 0,
      lastTickElapsedMs: null,
      lastTickAt: null,
      warningsTotal: 0,
    };
  }

  updateFromTickSV(_summary: NotificationsDispatchTickSummaryDTO): void {
    this._state.eventsProcessed += _summary.processedEvents;
    this._state.deliveriesSent += _summary.sentDeliveries;
    this._state.deliveriesFailed += _summary.failedDeliveries;
    this._state.disabledTokens += _summary.disabledTokens;
    this._state.backlogEvents = _summary.backlogEvents;
    this._state.backlogDeliveries = _summary.backlogDeliveries;
    this._state.lastTickElapsedMs = _summary.elapsedMs;
    this._state.lastTickAt = new Date().toISOString();
  }

  updateFromDeliveryOutcomeSV(_outcome: NotificationsDispatchDeliveryOutcomeDTO): void {
    if (_outcome.status === 'FAILED' && _outcome.attemptCount > 1) {
      this._state.deliveriesRetried += 1;
    }
  }

  updateFromWarningSV(_warning: NotificationsDispatchWarningDTO): void {
    void _warning;
    this._state.warningsTotal += 1;
  }
}

function safeJsonLogSV(_obj: Record<string, unknown>): void {
  // Logging estructurado: un JSON por línea.
  console.log(JSON.stringify(_obj));
}

export class NotificationsObservabilityAdapter implements NotificationsObservability {
  constructor(private readonly _metrics: InMemoryNotificationsMetrics) {}

  onTickCompletedSV(_summary: NotificationsDispatchTickSummaryDTO): void {
    this._metrics.updateFromTickSV(_summary);
    safeJsonLogSV({
      kind: 'notifications.dispatch.tick',
      status: 'COMPLETED',
      processedEvents: _summary.processedEvents,
      createdDeliveries: _summary.createdDeliveries,
      attemptedDeliveries: _summary.attemptedDeliveries,
      sentDeliveries: _summary.sentDeliveries,
      failedDeliveries: _summary.failedDeliveries,
      disabledTokens: _summary.disabledTokens,
      backlogEvents: _summary.backlogEvents,
      backlogDeliveries: _summary.backlogDeliveries,
      elapsedMs: _summary.elapsedMs,
    });
  }

  onBatchCompletedSV(_batch: NotificationsDispatchBatchOutcomeDTO): void {
    safeJsonLogSV({
      kind: 'notifications.dispatch.batch',
      eventId: _batch.eventId,
      provider: _batch.provider,
      status: 'COMPLETED',
      attemptedDeliveries: _batch.attemptedDeliveries,
      attemptedTokens: _batch.attemptedTokens,
      failureCount: _batch.failureCount,
      elapsedMs: _batch.elapsedMs,
    });
  }

  onDeliveryOutcomeSV(_outcome: NotificationsDispatchDeliveryOutcomeDTO): void {
    this._metrics.updateFromDeliveryOutcomeSV(_outcome);
    safeJsonLogSV({
      kind: 'notifications.dispatch.delivery',
      eventId: _outcome.eventId,
      deliveryId: _outcome.deliveryId,
      attemptCount: _outcome.attemptCount,
      status: _outcome.status,
      provider: _outcome.provider,
      errorCode: _outcome.errorCode,
      elapsedMs: _outcome.elapsedMs,
    });
  }

  onWarningSV(_warning: NotificationsDispatchWarningDTO): void {
    this._metrics.updateFromWarningSV(_warning);
    safeJsonLogSV({
      ..._warning,
      kind: 'notifications.dispatch.warning',
      status: 'WARNING',
    });
  }
}

export const NOTIFICATIONS_METRICS = new InMemoryNotificationsMetrics();
export const NOTIFICATIONS_OBSERVABILITY = new NotificationsObservabilityAdapter(NOTIFICATIONS_METRICS);

