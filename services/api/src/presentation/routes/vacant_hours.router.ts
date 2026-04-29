import { Router } from 'express';

import {
  getVacantHoursCON,
  patchCancelVacantHourCON,
  postPublishVacantHourCON,
} from '../controllers/vacant_hours.controller.js';
import { asyncHandler } from '../middleware/async_handler.js';

export const VACANT_HOURS_ROUTER = Router();

VACANT_HOURS_ROUTER.post('/vacant-hours/publish', asyncHandler(postPublishVacantHourCON));
VACANT_HOURS_ROUTER.get('/vacant-hours', asyncHandler(getVacantHoursCON));
VACANT_HOURS_ROUTER.patch('/vacant-hours/:id/cancel', asyncHandler(patchCancelVacantHourCON));

