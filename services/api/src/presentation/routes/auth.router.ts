import { Router } from 'express';

import { postLoginCON, postRefreshCON, postRegisterCON } from '../controllers/auth.controller.js';
import { asyncHandler } from '../middleware/async_handler.js';

export const AUTH_ROUTER = Router();

AUTH_ROUTER.post('/register', asyncHandler(postRegisterCON));
AUTH_ROUTER.post('/login', asyncHandler(postLoginCON));
AUTH_ROUTER.post('/refresh', asyncHandler(postRefreshCON));
