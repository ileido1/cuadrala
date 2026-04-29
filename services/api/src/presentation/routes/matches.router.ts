import { Router } from 'express';

import {
  getMatchByIdCON,
  getMatchesCON,
  getOpenMatchesCON,
  postFinishMatchCON,
  postLeaveMatchCON,
  patchCancelMatchCON,
  patchUpdateMatchCON,
  postCreateMatchCON,
  postJoinMatchCON,
  postStartMatchCON,
} from '../controllers/matches.controller.js';
import {
  postConfirmMatchResultDraftCON,
  postReproposeMatchResultDraftCON,
  putMatchResultDraftCON,
} from '../controllers/match_results.controller.js';
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
MATCHES_ROUTER.post('/matches/:matchId/leave', requireAuth, asyncHandler(postLeaveMatchCON));
MATCHES_ROUTER.post('/matches/:matchId/start', requireAuth, asyncHandler(postStartMatchCON));
MATCHES_ROUTER.post('/matches/:matchId/finish', requireAuth, asyncHandler(postFinishMatchCON));
MATCHES_ROUTER.put('/matches/:matchId/result-draft', requireAuth, asyncHandler(putMatchResultDraftCON));
MATCHES_ROUTER.post('/matches/:matchId/result-draft/confirm', requireAuth, asyncHandler(postConfirmMatchResultDraftCON));
MATCHES_ROUTER.post('/matches/:matchId/result-draft/reproposal', requireAuth, asyncHandler(postReproposeMatchResultDraftCON));

