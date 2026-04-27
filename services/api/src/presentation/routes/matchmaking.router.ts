import { Router } from 'express';

import { getMatchmakingSuggestionsCON } from '../controllers/matchmaking.controller.js';
import { asyncHandler } from '../middleware/async_handler.js';

export const MATCHMAKING_ROUTER = Router();

MATCHMAKING_ROUTER.get(
  '/matchmaking/:matchId/suggestions',
  asyncHandler(getMatchmakingSuggestionsCON),
);
