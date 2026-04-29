import { Router } from 'express';

import {
  getNotificationsMetricsCON,
  postCreateMatchCancelledNotificationEventCON,
  postDispatchNotificationsCON,
} from '../controllers/notifications.controller.js';
import { asyncHandler } from '../middleware/async_handler.js';

export const NOTIFICATIONS_ROUTER = Router();

NOTIFICATIONS_ROUTER.post('/notifications/dispatch', asyncHandler(postDispatchNotificationsCON));
NOTIFICATIONS_ROUTER.post(
  '/notifications/events/match-cancelled',
  asyncHandler(postCreateMatchCancelledNotificationEventCON),
);
NOTIFICATIONS_ROUTER.get('/notifications/metrics', asyncHandler(getNotificationsMetricsCON));

