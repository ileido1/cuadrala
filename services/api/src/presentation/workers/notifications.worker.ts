import type { DispatchNotificationsUseCase } from '../../application/use_cases/dispatch_notifications.use_case.js';
import { ENV_CONST } from '../../config/env.js';
import { NOTIFICATIONS_OBSERVABILITY } from '../observability/notifications_metrics.js';
import type { DistributedLockRepository } from '../../domain/ports/distributed_lock_repository.js';

export type NotificationsWorkerHandle = { stopSV: () => void };

async function withTimeoutSV<T>(_promise: Promise<T>, _timeoutMs: number): Promise<T> {
  if (_timeoutMs <= 0) {
    return _promise;
  }
  return await new Promise<T>((_resolve, _reject) => {
    const timeoutId = setTimeout(() => _reject(new Error('tick_timeout')), _timeoutMs);
    _promise
      .then((_v) => {
        clearTimeout(timeoutId);
        _resolve(_v);
      })
      .catch((_e) => {
        clearTimeout(timeoutId);
        _reject(_e);
      });
  });
}

export function startNotificationsWorkerSV(
  _dispatchNotificationsUC: DispatchNotificationsUseCase,
  _distributedLockRepository: DistributedLockRepository | null = null,
): NotificationsWorkerHandle | null {
  if (ENV_CONST.NODE_ENV === 'test') {
    return null;
  }

  if (!ENV_CONST.NOTIFICATIONS_WORKER_ENABLED) {
    return null;
  }

  const INTERVAL_MS = ENV_CONST.NOTIFICATIONS_WORKER_INTERVAL_MS;
  const LIMIT_EVENTS = ENV_CONST.NOTIFICATIONS_WORKER_LIMIT_EVENTS;
  const LIMIT_DELIVERIES = ENV_CONST.NOTIFICATIONS_WORKER_LIMIT_DELIVERIES;
  const LIMIT_TOKENS = ENV_CONST.NOTIFICATIONS_WORKER_LIMIT_TOKENS;
  const TICK_TIMEOUT_MS = ENV_CONST.NOTIFICATIONS_WORKER_TICK_TIMEOUT_MS;
  const ALERT_BACKLOG_EVENTS = ENV_CONST.NOTIFICATIONS_WORKER_ALERT_BACKLOG_EVENTS;
  const ALERT_BACKLOG_DELIVERIES = ENV_CONST.NOTIFICATIONS_WORKER_ALERT_BACKLOG_DELIVERIES;
  const ALERT_FAILURE_RATE_PCT = ENV_CONST.NOTIFICATIONS_WORKER_ALERT_FAILURE_RATE_PCT;
  const ALERT_FAILURE_RATE_MIN_ATTEMPTS = ENV_CONST.NOTIFICATIONS_WORKER_ALERT_FAILURE_RATE_MIN_ATTEMPTS;

  let isRunning = false;
  let lastBacklogEvents: number | null = null;
  let lastBacklogDeliveries: number | null = null;

  const tickSV = async (): Promise<void> => {
    if (isRunning) {
      NOTIFICATIONS_OBSERVABILITY.onWarningSV({ kind: 'OVERLAP_SKIPPED' });
      return;
    }
    isRunning = true;
    const LOCK_NAME = 'notifications_dispatch_worker';
    const TICK_STARTED_AT = Date.now();
    try {
      if (_distributedLockRepository !== null) {
        const LOCKED = await _distributedLockRepository.tryAcquireSV(LOCK_NAME);
        if (!LOCKED) {
          NOTIFICATIONS_OBSERVABILITY.onWarningSV({ kind: 'OVERLAP_SKIPPED' });
          return;
        }
      }

      const RES = await withTimeoutSV(
        _dispatchNotificationsUC.executeSV(LIMIT_EVENTS, LIMIT_DELIVERIES, LIMIT_TOKENS),
        TICK_TIMEOUT_MS,
      );

      if (lastBacklogEvents !== null && RES.backlogEvents > lastBacklogEvents) {
        if (RES.backlogEvents >= ALERT_BACKLOG_EVENTS) {
          NOTIFICATIONS_OBSERVABILITY.onWarningSV({
            kind: 'BACKLOG_GROWING',
            backlogEvents: RES.backlogEvents,
            backlogDeliveries: RES.backlogDeliveries,
          });
        }
      }
      if (lastBacklogDeliveries !== null && RES.backlogDeliveries > lastBacklogDeliveries) {
        if (RES.backlogDeliveries >= ALERT_BACKLOG_DELIVERIES) {
          NOTIFICATIONS_OBSERVABILITY.onWarningSV({
            kind: 'BACKLOG_GROWING',
            backlogEvents: RES.backlogEvents,
            backlogDeliveries: RES.backlogDeliveries,
          });
        }
      }

      lastBacklogEvents = RES.backlogEvents;
      lastBacklogDeliveries = RES.backlogDeliveries;

      const ATTEMPTED = RES.attemptedDeliveries;
      const FAILED = RES.failedDeliveries;
      if (ATTEMPTED >= ALERT_FAILURE_RATE_MIN_ATTEMPTS) {
        const FAILURE_RATE_PCT = ATTEMPTED === 0 ? 0 : Math.round((FAILED / ATTEMPTED) * 100);
        if (FAILURE_RATE_PCT >= ALERT_FAILURE_RATE_PCT) {
          NOTIFICATIONS_OBSERVABILITY.onWarningSV({
            kind: 'FAILURE_RATE_HIGH',
            attemptedDeliveries: ATTEMPTED,
            failedDeliveries: FAILED,
          });
        }
      }

      const TICK_ELAPSED_MS = Date.now() - TICK_STARTED_AT;
      if (TICK_TIMEOUT_MS > 0 && TICK_ELAPSED_MS > TICK_TIMEOUT_MS) {
        NOTIFICATIONS_OBSERVABILITY.onWarningSV({
          kind: 'TICK_TIMEOUT',
          tickElapsedMs: TICK_ELAPSED_MS,
        });
      }
    } catch (_error) {
      const ELAPSED_MS = Date.now() - TICK_STARTED_AT;
      const IS_TIMEOUT = _error instanceof Error && _error.message === 'tick_timeout';
      if (IS_TIMEOUT) {
        NOTIFICATIONS_OBSERVABILITY.onWarningSV({ kind: 'TICK_TIMEOUT', tickElapsedMs: ELAPSED_MS });
      }
      console.log(
        JSON.stringify({
          kind: 'notifications.dispatch.tick',
          status: 'FAILED',
          elapsedMs: ELAPSED_MS,
          errorCode: IS_TIMEOUT ? 'tick_timeout' : 'tick_failed',
        }),
      );
    } finally {
      if (_distributedLockRepository !== null) {
        try {
          await _distributedLockRepository.releaseSV(LOCK_NAME);
        } catch {
          // best-effort
        }
      }
      isRunning = false;
    }
  };

  void tickSV();
  const intervalId = setInterval(() => {
    void tickSV();
  }, INTERVAL_MS);

  const stopSV = (): void => {
    clearInterval(intervalId);
  };

  return { stopSV };
}

