import { Router } from 'express';

import { ENV_CONST } from '../../config/env.js';
import { patchAdminCancelMatchCON } from '../controllers/admin_matches.controller.js';
import { asyncHandler } from '../middleware/async_handler.js';
import { requireSecret } from '../middleware/auth.middleware.js';

export const ADMIN_ROUTER = Router();

ADMIN_ROUTER.patch(
  '/admin/matches/:matchId/cancel',
  requireSecret('x-admin-secret', ENV_CONST.ADMIN_DISPATCH_SECRET),
  asyncHandler(patchAdminCancelMatchCON),
);
