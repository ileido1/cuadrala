import { Router } from 'express';

import { ENV_CONST } from '../../config/env.js';
import { postRecalculateRankingCON } from '../controllers/ranking.controller.js';
import { asyncHandler } from '../middleware/async_handler.js';
import { requireSecret } from '../middleware/auth.middleware.js';

export const RANKING_ROUTER = Router();

//? Recalcular un ranking es una operación de mantenimiento costosa, no una
//? acción de usuario: se protege con el secreto de admin, no con sesión.
RANKING_ROUTER.post(
  '/ranking/recalculate/:categoryId',
  requireSecret('x-admin-secret', ENV_CONST.ADMIN_DISPATCH_SECRET),
  asyncHandler(postRecalculateRankingCON),
);
