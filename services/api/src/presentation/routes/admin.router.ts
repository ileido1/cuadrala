import { Router } from 'express';

import { patchAdminCancelMatchCON } from '../controllers/admin_matches.controller.js';
import { asyncHandler } from '../middleware/async_handler.js';

export const ADMIN_ROUTER = Router();

ADMIN_ROUTER.patch('/admin/matches/:matchId/cancel', asyncHandler(patchAdminCancelMatchCON));

