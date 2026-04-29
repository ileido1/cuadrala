import { Router } from 'express';

import {
  getMatchChatMessagesCON,
  getTournamentChatMessagesCON,
  postMatchChatMessageCON,
  postTournamentChatMessageCON,
} from '../controllers/chat.controller.js';
import { asyncHandler } from '../middleware/async_handler.js';
import { requireAuth } from '../middleware/auth.middleware.js';

export const CHAT_ROUTER = Router();

CHAT_ROUTER.get('/matches/:matchId/chat/messages', requireAuth, asyncHandler(getMatchChatMessagesCON));
CHAT_ROUTER.post('/matches/:matchId/chat/messages', requireAuth, asyncHandler(postMatchChatMessageCON));

CHAT_ROUTER.get(
  '/tournaments/:tournamentId/chat/messages',
  requireAuth,
  asyncHandler(getTournamentChatMessagesCON),
);
CHAT_ROUTER.post(
  '/tournaments/:tournamentId/chat/messages',
  requireAuth,
  asyncHandler(postTournamentChatMessageCON),
);

