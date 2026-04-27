import { Router } from 'express';

import {
  getMatchTransactionsSummaryCON,
  getUserTransactionsCON,
  patchConfirmTransactionManualCON,
  patchUserSubscriptionCON,
  postCreateMatchObligationsCON,
} from '../controllers/monetization.controller.js';
import { asyncHandler } from '../middleware/async_handler.js';

export const MONETIZATION_ROUTER = Router();

MONETIZATION_ROUTER.post(
  '/matches/:matchId/transactions/create-obligations',
  asyncHandler(postCreateMatchObligationsCON),
);
MONETIZATION_ROUTER.get(
  '/matches/:matchId/transactions/summary',
  asyncHandler(getMatchTransactionsSummaryCON),
);
MONETIZATION_ROUTER.patch(
  '/transactions/:transactionId/confirm-manual',
  asyncHandler(patchConfirmTransactionManualCON),
);
MONETIZATION_ROUTER.get('/users/:userId/transactions', asyncHandler(getUserTransactionsCON));
MONETIZATION_ROUTER.patch('/users/:userId/subscription', asyncHandler(patchUserSubscriptionCON));
