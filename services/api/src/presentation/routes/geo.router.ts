import { Router } from 'express';

import { getGeoPlaceDetailsCON, getGeoPlacesSearchCON } from '../controllers/geo.controller.js';
import { asyncHandler } from '../middleware/async_handler.js';

export const GEO_ROUTER = Router();

GEO_ROUTER.get('/geo/places/search', asyncHandler(getGeoPlacesSearchCON));
GEO_ROUTER.get('/geo/places/:placeId', asyncHandler(getGeoPlaceDetailsCON));

