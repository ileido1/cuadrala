import { Router } from 'express';

import { postParametrizedTournamentCON } from '../controllers/parametrized_tournament.controller.js';
import { asyncHandler } from '../middleware/async_handler.js';

export const PARAMETRIZED_TOURNAMENT_ROUTER = Router();

PARAMETRIZED_TOURNAMENT_ROUTER.post('/tournaments', asyncHandler(postParametrizedTournamentCON));
