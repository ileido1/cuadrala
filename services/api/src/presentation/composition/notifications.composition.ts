import { DispatchNotificationsUseCase } from '../../application/use_cases/dispatch_notifications.use_case.js';
import { DisableMyNotificationSubscriptionUseCase } from '../../application/use_cases/disable_my_notification_subscription.use_case.js';
import { ListMyNotificationSubscriptionsUseCase } from '../../application/use_cases/list_my_notification_subscriptions.use_case.js';
import { UpsertMyNotificationSubscriptionUseCase } from '../../application/use_cases/upsert_my_notification_subscription.use_case.js';
import { PrismaMatchNotificationContextReadRepository } from '../../infrastructure/adapters/prisma_match_notification_context_read_repository.js';
import { PrismaMatchParticipationRepository } from '../../infrastructure/adapters/prisma_match_participation_repository.js';
import { PrismaDevicePushTokenRepository } from '../../infrastructure/adapters/prisma_device_push_token_repository.js';
import { FcmPushNotificationProvider } from '../../infrastructure/adapters/fcm_push_notification_provider.js';
import { NoopPushNotificationProvider } from '../../infrastructure/adapters/noop_push_notification_provider.js';
import { PrismaNotificationDeliveryRepository } from '../../infrastructure/adapters/prisma_notification_delivery_repository.js';
import { PrismaNotificationEventRepository } from '../../infrastructure/adapters/prisma_notification_event_repository.js';
import { PrismaNotificationSubscriptionRepository } from '../../infrastructure/adapters/prisma_notification_subscription_repository.js';
import { ENV_CONST } from '../../config/env.js';
import { NOTIFICATIONS_OBSERVABILITY } from '../observability/notifications_metrics.js';

const NOTIFICATION_SUBSCRIPTION_REPOSITORY = new PrismaNotificationSubscriptionRepository();
const NOTIFICATION_EVENT_REPOSITORY = new PrismaNotificationEventRepository();
const NOTIFICATION_DELIVERY_REPOSITORY = new PrismaNotificationDeliveryRepository();
const MATCH_NOTIFICATION_CONTEXT_READ_REPOSITORY = new PrismaMatchNotificationContextReadRepository();
const MATCH_PARTICIPATION_REPOSITORY = new PrismaMatchParticipationRepository();
const DEVICE_PUSH_TOKEN_REPOSITORY = new PrismaDevicePushTokenRepository();

const PUSH_PROVIDER =
  ENV_CONST.FCM_SERVICE_ACCOUNT_JSON_BASE64 !== undefined &&
  ENV_CONST.FCM_SERVICE_ACCOUNT_JSON_BASE64 !== ''
    ? new FcmPushNotificationProvider(
        ENV_CONST.FCM_SERVICE_ACCOUNT_JSON_BASE64,
        ENV_CONST.FCM_DRY_RUN ?? false,
      )
    : new NoopPushNotificationProvider();

export const UPSERT_MY_NOTIFICATION_SUBSCRIPTION_UC = new UpsertMyNotificationSubscriptionUseCase(
  NOTIFICATION_SUBSCRIPTION_REPOSITORY,
);
export const LIST_MY_NOTIFICATION_SUBSCRIPTIONS_UC = new ListMyNotificationSubscriptionsUseCase(
  NOTIFICATION_SUBSCRIPTION_REPOSITORY,
);
export const DISABLE_MY_NOTIFICATION_SUBSCRIPTION_UC = new DisableMyNotificationSubscriptionUseCase(
  NOTIFICATION_SUBSCRIPTION_REPOSITORY,
);

export const DISPATCH_NOTIFICATIONS_UC = new DispatchNotificationsUseCase(
  NOTIFICATION_EVENT_REPOSITORY,
  NOTIFICATION_SUBSCRIPTION_REPOSITORY,
  NOTIFICATION_DELIVERY_REPOSITORY,
  MATCH_NOTIFICATION_CONTEXT_READ_REPOSITORY,
  MATCH_PARTICIPATION_REPOSITORY,
  DEVICE_PUSH_TOKEN_REPOSITORY,
  PUSH_PROVIDER,
  NOTIFICATIONS_OBSERVABILITY,
);

