import { Router } from 'express';

import {
  getVenuesCON,
  postVenueCON,
  postCourtCON,
} from '../controllers/venues.controller.js';
import { postVenueGeocodeCON } from '../controllers/venue_geocoding.controller.js';
import { asyncHandler } from '../middleware/async_handler.js';

export const VENUES_ROUTER = Router();

VENUES_ROUTER.get('/venues', asyncHandler(getVenuesCON));
VENUES_ROUTER.post('/venues', asyncHandler(postVenueCON));
VENUES_ROUTER.post('/venues/:venueId/courts', asyncHandler(postCourtCON));
VENUES_ROUTER.post('/venues/:venueId/geocode', asyncHandler(postVenueGeocodeCON));

