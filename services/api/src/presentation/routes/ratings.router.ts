import { Router } from 'express';

import { getEloLeaderboardCON } from '../controllers/elo_leaderboard.controller.js';
import { asyncHandler } from '../middleware/async_handler.js';

export const RATINGS_ROUTER = Router();

RATINGS_ROUTER.get('/ratings/leaderboard', asyncHandler(getEloLeaderboardCON));

