import { Router } from 'express';

import {
  postLoginCON,
  postLogoutCON,
  postRefreshCON,
  postRegisterCON,
  postSocialLoginCON,
} from '../controllers/auth.controller.js';
import { asyncHandler } from '../middleware/async_handler.js';

export const AUTH_ROUTER = Router();

AUTH_ROUTER.post('/register', asyncHandler(postRegisterCON));
AUTH_ROUTER.post('/login', asyncHandler(postLoginCON));
AUTH_ROUTER.post('/social', asyncHandler(postSocialLoginCON));
AUTH_ROUTER.post('/refresh', asyncHandler(postRefreshCON));
AUTH_ROUTER.post('/logout', asyncHandler(postLogoutCON));
