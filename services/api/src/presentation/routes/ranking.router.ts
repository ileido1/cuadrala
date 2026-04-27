import { Router } from 'express';

import { postRecalculateRankingCON } from '../controllers/ranking.controller.js';
import { asyncHandler } from '../middleware/async_handler.js';

export const RANKING_ROUTER = Router();

RANKING_ROUTER.post('/ranking/recalculate/:categoryId', asyncHandler(postRecalculateRankingCON));
