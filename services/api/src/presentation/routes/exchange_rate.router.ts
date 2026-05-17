import { Router } from 'express';

import {
  getExchangeRatesByCountryCON,
  postRefreshExchangeRatesCON,
} from '../controllers/exchange_rates.controller.js';
import { asyncHandler } from '../middleware/async_handler.js';
import { requireAuth } from '../middleware/auth.middleware.js';

const EXCHANGE_RATE_ROUTER = Router();

EXCHANGE_RATE_ROUTER.get(
  '/countries/:countryCode/exchange-rates',
  asyncHandler(getExchangeRatesByCountryCON),
);

EXCHANGE_RATE_ROUTER.post(
  '/countries/:countryCode/exchange-rates/refresh',
  requireAuth,
  asyncHandler(postRefreshExchangeRatesCON),
);

export { EXCHANGE_RATE_ROUTER };
