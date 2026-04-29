import type { MatchParticipationRepository } from '../../domain/ports/match_participation_repository.js';
import type { MatchNotificationContextReadRepository } from '../../domain/ports/match_notification_context_read_repository.js';
import type { DevicePushTokenRepository } from '../../domain/ports/device_push_token_repository.js';
import type { NotificationDeliveryRepository } from '../../domain/ports/notification_delivery_repository.js';
import type { NotificationEventRepository } from '../../domain/ports/notification_event_repository.js';
import type { NotificationSubscriptionRepository } from '../../domain/ports/notification_subscription_repository.js';
import type { NotificationsObservability } from '../../domain/ports/notifications_observability.js';
import type { PushNotificationProvider } from '../../domain/ports/push_notification_provider.js';
import { NoopNotificationsObservability } from '../../domain/ports/notifications_observability.js';

export type DispatchNotificationsResultDTO = {
  processedEvents: number;
  createdDeliveries: number;
  attemptedDeliveries: number;
  sentDeliveries: number;
  failedDeliveries: number;
  disabledTokens: number;
  backlogEvents: number;
  backlogDeliveries: number;
};

const MAX_DELIVERY_ATTEMPTS = 5;

function computeNextAttemptAtSV(_attemptCount: number, _now: Date): Date | null {
  if (_attemptCount >= MAX_DELIVERY_ATTEMPTS) {
    return null;
  }
  const BASE_SECONDS = 60;
  const DELAY_SECONDS = Math.min(BASE_SECONDS * 2 ** (_attemptCount - 1), 3600);
  return new Date(_now.getTime() + DELAY_SECONDS * 1000);
}

function isInvalidTokenErrorSV(_errorCode: string | undefined, _errorMessage: string): boolean {
  const CODE = _errorCode ?? '';
  if (CODE === 'messaging/registration-token-not-registered' || CODE === 'messaging/invalid-argument') {
    return true;
  }
  const MSG = _errorMessage.toLowerCase();
  return MSG.includes('registration-token-not-registered') || MSG.includes('invalid-argument');
}

export class DispatchNotificationsUseCase {
  constructor(
    private readonly _notificationEventRepository: NotificationEventRepository,
    private readonly _notificationSubscriptionRepository: NotificationSubscriptionRepository,
    private readonly _notificationDeliveryRepository: NotificationDeliveryRepository,
    private readonly _matchNotificationContextReadRepository: MatchNotificationContextReadRepository,
    private readonly _matchParticipationRepository: MatchParticipationRepository,
    private readonly _devicePushTokenRepository: DevicePushTokenRepository,
    private readonly _pushNotificationProvider: PushNotificationProvider,
    private readonly _observability: NotificationsObservability = new NoopNotificationsObservability(),
  ) {}

  async executeSV(
    _limitEvents = 100,
    _limitDeliveries = 1000,
    _limitTokens = Number.POSITIVE_INFINITY,
  ): Promise<DispatchNotificationsResultDTO> {
    const TICK_STARTED_AT = Date.now();
    const NOW = new Date();

    const [backlogEvents, backlogDeliveries] = await Promise.all([
      this._notificationEventRepository.countPendingSV(),
      this._notificationDeliveryRepository.countBacklogSV(NOW),
    ]);

    const EVENTS = await this._notificationEventRepository.listPendingSV(_limitEvents);

    let createdDeliveries = 0;
    let disabledTokens = 0;

    for (const _event of EVENTS) {
      const MATCH_CONTEXT = await this._matchNotificationContextReadRepository.getByMatchIdSV(
        _event.matchId,
      );
      if (MATCH_CONTEXT === null) {
        await this._notificationEventRepository.markProcessedSV(_event.id, new Date());
        continue;
      }

      if (MATCH_CONTEXT.venueLat === null || MATCH_CONTEXT.venueLng === null) {
        await this._notificationEventRepository.markProcessedSV(_event.id, new Date());
        continue;
      }

      const EXCLUDE_USER_IDS = await this._matchParticipationRepository.listParticipantUserIdsSV(
        _event.matchId,
      );

      const RECIPIENTS = await this._notificationSubscriptionRepository.findRecipientsForEventSV({
        eventType: _event.type,
        categoryId: _event.categoryId,
        matchLat: MATCH_CONTEXT.venueLat,
        matchLng: MATCH_CONTEXT.venueLng,
        excludeUserIds: EXCLUDE_USER_IDS,
      });

      const RECIPIENT_USER_IDS = RECIPIENTS.map((_r) => _r.userId);
      const TOKENS = await this._devicePushTokenRepository.listEnabledTokensByUserIdsSV(
        RECIPIENT_USER_IDS,
      );

      const USERS_WITH_TOKENS = new Set(TOKENS.map((_t) => _t.userId));
      const ELIGIBLE_USER_IDS = RECIPIENT_USER_IDS.filter((_u) => USERS_WITH_TOKENS.has(_u));

      const CREATE_MANY = await this._notificationDeliveryRepository.createManyIdempotentSV(
        ELIGIBLE_USER_IDS.map((_userId) => ({
          eventId: _event.id,
          userId: _userId,
          status: 'PENDING',
          error: null,
          sentAt: null,
          attemptCount: 0,
          nextAttemptAt: null,
          lastAttemptAt: null,
          lastErrorCode: null,
        })),
      );
      createdDeliveries += CREATE_MANY.createdCount;
    }

    let attemptedDeliveries = 0;
    let sentDeliveries = 0;
    let failedDeliveries = 0;
    const DUE = await this._notificationDeliveryRepository.listDueDeliveriesWithEventSV(
      _limitDeliveries,
      NOW,
    );

    const DUE_BY_EVENT: Record<string, typeof DUE> = {};
    for (const _d of DUE) {
      const LIST = (DUE_BY_EVENT[_d.eventId] ??= []);
      LIST.push(_d);
    }

    let remainingTokenBudget = Number.isFinite(_limitTokens) ? Math.max(0, _limitTokens) : Number.POSITIVE_INFINITY;

    for (const _eventId of Object.keys(DUE_BY_EVENT)) {
      if (remainingTokenBudget <= 0) {
        break;
      }
      const LIST = DUE_BY_EVENT[_eventId] ?? [];
      if (LIST.length === 0) {
        continue;
      }

      const EVENT = LIST[0]!.event;
      const USER_IDS = Array.from(new Set(LIST.map((_d) => _d.userId)));
      const TOKENS = await this._devicePushTokenRepository.listEnabledTokensByUserIdsSV(USER_IDS);

      const TOKENS_BY_USER: Record<string, string[]> = {};
      for (const _t of TOKENS) {
        const PER_USER = (TOKENS_BY_USER[_t.userId] ??= []);
        PER_USER.push(_t.token);
      }

      const deliveriesToProcess: typeof LIST = [];
      const tokensToSend: string[] = [];
      const seenTokens = new Set<string>();

      for (const _delivery of LIST) {
        const USER_TOKENS = TOKENS_BY_USER[_delivery.userId] ?? [];
        if (USER_TOKENS.length === 0) {
          deliveriesToProcess.push(_delivery);
          continue;
        }

        const NEW_TOKENS = USER_TOKENS.filter((_t) => !seenTokens.has(_t));
        const WOULD_ADD = NEW_TOKENS.length;
        // Respetar budget considerando tokens ya agregados en este batch.
        if (remainingTokenBudget - (tokensToSend.length + WOULD_ADD) < 0) {
          continue;
        }

        for (const _t of NEW_TOKENS) {
          seenTokens.add(_t);
          tokensToSend.push(_t);
        }
        deliveriesToProcess.push(_delivery);
      }

      remainingTokenBudget -= tokensToSend.length;

      const BATCH_STARTED_AT = Date.now();
      const CONTENT =
        EVENT.type === 'MATCH_SLOT_OPENED'
          ? { title: 'Se abrió una vacante', body: 'Hay una vacante disponible en una partida que coincide con tus preferencias.' }
          : EVENT.type === 'MATCH_CANCELLED'
            ? { title: 'Partida cancelada', body: 'Una partida fue cancelada.' }
            : EVENT.type === 'PAYMENT_PENDING'
              ? { title: 'Pago pendiente', body: 'Tienes un pago pendiente asociado a una partida.' }
              : { title: 'Nuevo mensaje', body: 'Tienes un nuevo mensaje en el chat.' };

      const PUSH_RESULT = await this._pushNotificationProvider.sendToDeviceTokensSV(tokensToSend, {
        title: CONTENT.title,
        body: CONTENT.body,
        data: {
          eventType: EVENT.type,
          matchId: EVENT.matchId,
          categoryId: EVENT.categoryId,
        },
      });
      const BATCH_ELAPSED_MS = Date.now() - BATCH_STARTED_AT;

      this._observability.onBatchCompletedSV({
        eventId: _eventId,
        provider: 'FCM',
        attemptedDeliveries: deliveriesToProcess.length,
        attemptedTokens: tokensToSend.length,
        elapsedMs: BATCH_ELAPSED_MS,
        failureCount: PUSH_RESULT.failureCount,
      });

      const FAILED_TOKENS = new Set(PUSH_RESULT.failures.map((_f) => _f.token));
      const FAILURE_BY_TOKEN = new Map(
        PUSH_RESULT.failures.map((_f) => [_f.token, { error: _f.error, errorCode: _f.errorCode }]),
      );

      const TOKENS_TO_DISABLE = new Set<string>();
      for (const _f of PUSH_RESULT.failures) {
        if (isInvalidTokenErrorSV(_f.errorCode, _f.error)) {
          TOKENS_TO_DISABLE.add(_f.token);
        }
      }
      for (const _token of TOKENS_TO_DISABLE) {
        const RES = await this._devicePushTokenRepository.disableByProviderTokenSV('FCM', _token);
        disabledTokens += RES.updatedCount;
      }

      for (const _delivery of deliveriesToProcess) {
        const DELIVERY_STARTED_AT = Date.now();
        attemptedDeliveries += 1;

        const USER_TOKENS = TOKENS_BY_USER[_delivery.userId] ?? [];
        if (USER_TOKENS.length === 0) {
          failedDeliveries += 1;
          await this._notificationDeliveryRepository.markFailedSV({
            deliveryId: _delivery.deliveryId,
            error: 'Sin tokens habilitados para el usuario.',
            errorCode: null,
            attemptCount: _delivery.attemptCount,
            lastAttemptAt: NOW,
            nextAttemptAt: null,
          });
          this._observability.onDeliveryOutcomeSV({
            eventId: _delivery.eventId,
            deliveryId: _delivery.deliveryId,
            attemptCount: _delivery.attemptCount,
            status: 'FAILED',
            provider: 'FCM',
            errorCode: null,
            elapsedMs: Date.now() - DELIVERY_STARTED_AT,
          });
          continue;
        }

        const ALL_FAILED = USER_TOKENS.every((_t) => FAILED_TOKENS.has(_t));
        if (!ALL_FAILED) {
          sentDeliveries += 1;
          await this._notificationDeliveryRepository.markSentSV(_delivery.deliveryId, NOW);
          this._observability.onDeliveryOutcomeSV({
            eventId: _delivery.eventId,
            deliveryId: _delivery.deliveryId,
            attemptCount: _delivery.attemptCount,
            status: 'SENT',
            provider: 'FCM',
            errorCode: null,
            elapsedMs: Date.now() - DELIVERY_STARTED_AT,
          });
          continue;
        }

        const NEXT_ATTEMPT_COUNT = _delivery.attemptCount + 1;
        const ANY_FAILURE = USER_TOKENS.map((_t) => FAILURE_BY_TOKEN.get(_t)).find((_f) => _f !== undefined);
        const ERROR = ANY_FAILURE?.error ?? 'Fallo envío push a todos los tokens.';
        const ERROR_CODE = ANY_FAILURE?.errorCode ?? null;
        const ALL_INVALID_TOKENS = USER_TOKENS.every((_t) => {
          const F = FAILURE_BY_TOKEN.get(_t);
          if (F === undefined) {
            return false;
          }
          return isInvalidTokenErrorSV(F.errorCode, F.error);
        });
        const NEXT_ATTEMPT_AT = ALL_INVALID_TOKENS
          ? null
          : computeNextAttemptAtSV(NEXT_ATTEMPT_COUNT, NOW);

        failedDeliveries += 1;
        await this._notificationDeliveryRepository.markFailedSV({
          deliveryId: _delivery.deliveryId,
          error: ERROR,
          errorCode: ERROR_CODE,
          attemptCount: NEXT_ATTEMPT_COUNT,
          lastAttemptAt: NOW,
          nextAttemptAt: NEXT_ATTEMPT_AT,
        });
        this._observability.onDeliveryOutcomeSV({
          eventId: _delivery.eventId,
          deliveryId: _delivery.deliveryId,
          attemptCount: NEXT_ATTEMPT_COUNT,
          status: 'FAILED',
          provider: 'FCM',
          errorCode: ERROR_CODE,
          elapsedMs: Date.now() - DELIVERY_STARTED_AT,
        });
      }
    }

    let processedEvents = 0;
    for (const _event of EVENTS) {
      const OUTSTANDING = await this._notificationDeliveryRepository.countOutstandingByEventIdSV(
        _event.id,
        NOW,
      );
      if (OUTSTANDING === 0) {
        processedEvents += 1;
        await this._notificationEventRepository.markProcessedSV(_event.id, NOW);
      }
    }

    const TICK_ELAPSED_MS = Date.now() - TICK_STARTED_AT;
    this._observability.onTickCompletedSV({
      processedEvents,
      createdDeliveries,
      attemptedDeliveries,
      sentDeliveries,
      failedDeliveries,
      disabledTokens,
      backlogEvents,
      backlogDeliveries,
      elapsedMs: TICK_ELAPSED_MS,
    });

    return {
      processedEvents,
      createdDeliveries,
      attemptedDeliveries,
      sentDeliveries,
      failedDeliveries,
      disabledTokens,
      backlogEvents,
      backlogDeliveries,
    };
  }
}

