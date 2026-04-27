import { Router } from 'express';

import { postAmericanoCON } from '../controllers/americano.controller.js';
import { asyncHandler } from '../middleware/async_handler.js';

export const AMERICANO_ROUTER = Router();

AMERICANO_ROUTER.post('/americanos', asyncHandler(postAmericanoCON));
