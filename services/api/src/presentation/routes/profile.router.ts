import { Router } from 'express';

import { getProfileCON, patchProfileCON } from '../controllers/profile.controller.js';
import { asyncHandler } from '../middleware/async_handler.js';
import { requireAuth } from '../middleware/auth.middleware.js';

export const PROFILE_ROUTER = Router();

PROFILE_ROUTER.get('/me', requireAuth, asyncHandler(getProfileCON));
PROFILE_ROUTER.patch('/me', requireAuth, asyncHandler(patchProfileCON));
