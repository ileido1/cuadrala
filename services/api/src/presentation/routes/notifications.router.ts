import { Router } from 'express';

import { ENV_CONST } from '../../config/env.js';
import {
  getNotificationsMetricsCON,
  postCreateChatMessageNotificationEventCON,
  postCreateMatchCancelledNotificationEventCON,
  postCreatePaymentPendingNotificationEventCON,
  postDispatchNotificationsCON,
} from '../controllers/notifications.controller.js';
import { asyncHandler } from '../middleware/async_handler.js';
import { requireSecret } from '../middleware/auth.middleware.js';

export const NOTIFICATIONS_ROUTER = Router();

//? Endpoints de operación: los consume el worker de dispatch, no la app.
const REQUIRE_DISPATCH_SECRET = requireSecret(
  'x-dispatch-secret',
  ENV_CONST.NOTIFICATIONS_DISPATCH_SECRET,
);

NOTIFICATIONS_ROUTER.post(
  '/notifications/dispatch',
  REQUIRE_DISPATCH_SECRET,
  asyncHandler(postDispatchNotificationsCON),
);
NOTIFICATIONS_ROUTER.post(
  '/notifications/events/match-cancelled',
  REQUIRE_DISPATCH_SECRET,
  asyncHandler(postCreateMatchCancelledNotificationEventCON),
);
NOTIFICATIONS_ROUTER.post(
  '/notifications/events/payment-pending',
  REQUIRE_DISPATCH_SECRET,
  asyncHandler(postCreatePaymentPendingNotificationEventCON),
);
NOTIFICATIONS_ROUTER.post(
  '/notifications/events/chat-message',
  REQUIRE_DISPATCH_SECRET,
  asyncHandler(postCreateChatMessageNotificationEventCON),
);
NOTIFICATIONS_ROUTER.get(
  '/notifications/metrics',
  REQUIRE_DISPATCH_SECRET,
  asyncHandler(getNotificationsMetricsCON),
);
