import { Router } from 'express';

import {
  getNotificationsMetricsCON,
  postCreateChatMessageNotificationEventCON,
  postCreateMatchCancelledNotificationEventCON,
  postCreatePaymentPendingNotificationEventCON,
  postDispatchNotificationsCON,
} from '../controllers/notifications.controller.js';
import { asyncHandler } from '../middleware/async_handler.js';

export const NOTIFICATIONS_ROUTER = Router();

NOTIFICATIONS_ROUTER.post('/notifications/dispatch', asyncHandler(postDispatchNotificationsCON));
NOTIFICATIONS_ROUTER.post(
  '/notifications/events/match-cancelled',
  asyncHandler(postCreateMatchCancelledNotificationEventCON),
);
NOTIFICATIONS_ROUTER.post(
  '/notifications/events/payment-pending',
  asyncHandler(postCreatePaymentPendingNotificationEventCON),
);
NOTIFICATIONS_ROUTER.post(
  '/notifications/events/chat-message',
  asyncHandler(postCreateChatMessageNotificationEventCON),
);
NOTIFICATIONS_ROUTER.get('/notifications/metrics', asyncHandler(getNotificationsMetricsCON));

