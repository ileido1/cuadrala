import { Router } from 'express';

import { getHealthCON } from '../controllers/health.controller.js';

export const HEALTH_ROUTER = Router();

HEALTH_ROUTER.get('/health', getHealthCON);
