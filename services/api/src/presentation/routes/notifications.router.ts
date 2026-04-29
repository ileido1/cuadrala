import { Router } from 'express';

import { getNotificationsMetricsCON, postDispatchNotificationsCON } from '../controllers/notifications.controller.js';
import { asyncHandler } from '../middleware/async_handler.js';

export const NOTIFICATIONS_ROUTER = Router();

NOTIFICATIONS_ROUTER.post('/notifications/dispatch', asyncHandler(postDispatchNotificationsCON));
NOTIFICATIONS_ROUTER.get('/notifications/metrics', asyncHandler(getNotificationsMetricsCON));

