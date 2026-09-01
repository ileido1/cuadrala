import { Router } from 'express';

import { ENV_CONST } from '../../config/env.js';
import { getGeoPlaceDetailsCON, getGeoPlacesSearchCON } from '../controllers/geo.controller.js';
import { asyncHandler } from '../middleware/async_handler.js';
import { requireSecret } from '../middleware/auth.middleware.js';

export const GEO_ROUTER = Router();

//? Proxy al proveedor de mapas: se cobra por request, así que va detrás del
//? mismo secreto de operación que el geocoding de sedes.
GEO_ROUTER.get(
  '/geo/places/search',
  requireSecret('x-geo-secret', ENV_CONST.GEO_DISPATCH_SECRET),
  asyncHandler(getGeoPlacesSearchCON),
);
GEO_ROUTER.get(
  '/geo/places/:placeId',
  requireSecret('x-geo-secret', ENV_CONST.GEO_DISPATCH_SECRET),
  asyncHandler(getGeoPlaceDetailsCON),
);
