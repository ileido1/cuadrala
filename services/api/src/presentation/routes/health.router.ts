import { Router } from 'express';

import { getHealthCON, getReadyCON } from '../controllers/health.controller.js';

export const HEALTH_ROUTER = Router();

HEALTH_ROUTER.get('/health', getHealthCON);
HEALTH_ROUTER.get('/ready', getReadyCON);
