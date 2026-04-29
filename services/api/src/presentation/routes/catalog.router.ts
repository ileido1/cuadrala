import { Router } from 'express';

import {
  getSportsCON,
  getTournamentFormatPresetsBySportCON,
  postPublishFormatPresetVersionCON,
} from '../controllers/catalog.controller.js';
import { asyncHandler } from '../middleware/async_handler.js';

export const CATALOG_ROUTER = Router();

CATALOG_ROUTER.get('/sports', asyncHandler(getSportsCON));
CATALOG_ROUTER.get(
  '/sports/:sportId/tournament-format-presets',
  asyncHandler(getTournamentFormatPresetsBySportCON),
);
CATALOG_ROUTER.post(
  '/sports/:sportId/tournament-format-presets/:code/versions',
  asyncHandler(postPublishFormatPresetVersionCON),
);
