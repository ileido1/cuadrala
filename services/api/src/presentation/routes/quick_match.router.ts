import { Router } from 'express';

import {
  deleteMyQuickMatchCON,
  postConfirmMyQuickMatchProposalCON,
  postDismissMyQuickMatchProposalCON,
  getMyQuickMatchCON,
  postQuickMatchCON,
} from '../controllers/quick_match.controller.js';
import { requireAuth } from '../middleware/auth.middleware.js';
import { asyncHandler } from '../middleware/async_handler.js';

export const QUICK_MATCH_ROUTER = Router();

QUICK_MATCH_ROUTER.get('/quick-match', requireAuth, asyncHandler(getMyQuickMatchCON));
QUICK_MATCH_ROUTER.post('/quick-match', requireAuth, asyncHandler(postQuickMatchCON));
QUICK_MATCH_ROUTER.delete('/quick-match', requireAuth, asyncHandler(deleteMyQuickMatchCON));
QUICK_MATCH_ROUTER.post('/quick-match/proposal/dismiss', requireAuth, asyncHandler(postDismissMyQuickMatchProposalCON));
QUICK_MATCH_ROUTER.post('/quick-match/proposal/confirm', requireAuth, asyncHandler(postConfirmMyQuickMatchProposalCON));
