import { Router } from 'express';

import { getProfileCON, patchProfileCON } from '../controllers/profile.controller.js';
import {
  deleteMyNotificationSubscriptionCON,
  getMyNotificationSubscriptionsCON,
  postUpsertMyNotificationSubscriptionCON,
} from '../controllers/notification_subscriptions.controller.js';
import {
  getMyInAppNotificationsCON,
  patchMarkAllMyInAppNotificationsReadCON,
  patchMarkMyInAppNotificationReadCON,
} from '../controllers/in_app_notifications.controller.js';
import {
  deleteMyDevicePushTokenCON,
  getMyDevicePushTokensCON,
  postUpsertMyDevicePushTokenCON,
} from '../controllers/device_push_tokens.controller.js';
import {
  getMyPlayerProfileCON,
  getUserStatsCON,
  patchMyPlayerProfileCON,
} from '../controllers/player_profile.controller.js';
import { getUserRatingHistoryCON, getUserRatingsCON } from '../controllers/ratings.controller.js';
import { asyncHandler } from '../middleware/async_handler.js';
import { requireAuth } from '../middleware/auth.middleware.js';

export const PROFILE_ROUTER = Router();

PROFILE_ROUTER.get('/me', requireAuth, asyncHandler(getProfileCON));
PROFILE_ROUTER.patch('/me', requireAuth, asyncHandler(patchProfileCON));
PROFILE_ROUTER.get('/me/notifications', requireAuth, asyncHandler(getMyInAppNotificationsCON));
PROFILE_ROUTER.patch(
  '/me/notifications/:deliveryId/read',
  requireAuth,
  asyncHandler(patchMarkMyInAppNotificationReadCON),
);
PROFILE_ROUTER.patch(
  '/me/notifications/read-all',
  requireAuth,
  asyncHandler(patchMarkAllMyInAppNotificationsReadCON),
);
PROFILE_ROUTER.get(
  '/me/notification-subscriptions',
  requireAuth,
  asyncHandler(getMyNotificationSubscriptionsCON),
);
PROFILE_ROUTER.post(
  '/me/notification-subscriptions',
  requireAuth,
  asyncHandler(postUpsertMyNotificationSubscriptionCON),
);
PROFILE_ROUTER.delete(
  '/me/notification-subscriptions/:id',
  requireAuth,
  asyncHandler(deleteMyNotificationSubscriptionCON),
);
PROFILE_ROUTER.get('/me/device-push-tokens', requireAuth, asyncHandler(getMyDevicePushTokensCON));
PROFILE_ROUTER.post('/me/device-push-tokens', requireAuth, asyncHandler(postUpsertMyDevicePushTokenCON));
PROFILE_ROUTER.delete(
  '/me/device-push-tokens/:id',
  requireAuth,
  asyncHandler(deleteMyDevicePushTokenCON),
);
PROFILE_ROUTER.get('/me/profile', requireAuth, asyncHandler(getMyPlayerProfileCON));
PROFILE_ROUTER.patch('/me/profile', requireAuth, asyncHandler(patchMyPlayerProfileCON));
PROFILE_ROUTER.get('/:userId/stats', asyncHandler(getUserStatsCON));
PROFILE_ROUTER.get('/:userId/ratings', asyncHandler(getUserRatingsCON));
PROFILE_ROUTER.get('/:userId/ratings/history', asyncHandler(getUserRatingHistoryCON));
