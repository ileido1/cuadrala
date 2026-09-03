import { Router } from 'express';

import {
  getCategoriesCON,
  getSportsCON,
  getTournamentFormatPresetsBySportCON,
  postPublishFormatPresetVersionCON,
} from '../controllers/catalog.controller.js';
import { ENV_CONST } from '../../config/env.js';
import { asyncHandler } from '../middleware/async_handler.js';
import { requireSecret } from '../middleware/auth.middleware.js';

export const CATALOG_ROUTER = Router();

CATALOG_ROUTER.get('/categories', asyncHandler(getCategoriesCON));
CATALOG_ROUTER.get('/sports', asyncHandler(getSportsCON));
CATALOG_ROUTER.get(
  '/sports/:sportId/tournament-format-presets',
  asyncHandler(getTournamentFormatPresetsBySportCON),
);
//? Catalogo global: no tiene dueno de negocio, asi que va detras del mismo
//? secreto compartido de ops que usan admin.router y ranking.router.
CATALOG_ROUTER.post(
  '/sports/:sportId/tournament-format-presets/:code/versions',
  requireSecret('x-admin-secret', ENV_CONST.ADMIN_DISPATCH_SECRET),
  asyncHandler(postPublishFormatPresetVersionCON),
);
