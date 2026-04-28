import { Router } from 'express';

import {
  getMatchByIdCON,
  getMatchesCON,
  getOpenMatchesCON,
  patchCancelMatchCON,
  patchUpdateMatchCON,
  postCreateMatchCON,
  postJoinMatchCON,
} from '../controllers/matches.controller.js';
import { asyncHandler } from '../middleware/async_handler.js';
import { requireAuth } from '../middleware/auth.middleware.js';

export const MATCHES_ROUTER = Router();

MATCHES_ROUTER.get('/matches', asyncHandler(getMatchesCON));
MATCHES_ROUTER.get('/matches/open', asyncHandler(getOpenMatchesCON));
MATCHES_ROUTER.get('/matches/:matchId', asyncHandler(getMatchByIdCON));
MATCHES_ROUTER.post('/matches', requireAuth, asyncHandler(postCreateMatchCON));
MATCHES_ROUTER.patch('/matches/:matchId', requireAuth, asyncHandler(patchUpdateMatchCON));
MATCHES_ROUTER.patch('/matches/:matchId/cancel', requireAuth, asyncHandler(patchCancelMatchCON));
MATCHES_ROUTER.post('/matches/:matchId/join', requireAuth, asyncHandler(postJoinMatchCON));

