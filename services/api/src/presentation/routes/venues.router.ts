import { Router } from 'express';

import {
  getVenuesCON,
  getVenueCON,
  getVenueCourtsCON,
  getVenuePaymentInfoCON,
  postVenueCON,
  postCourtCON,
  putCourtCON,
  deleteCourtCON,
} from '../controllers/venues.controller.js';
import {
  getDashboardStatsCON,
  getTransactionStatsCON,
  getTransactionHistoryCON,
  patchVenueCON,
  getVenueMatchesCON,
} from '../controllers/venue_dashboard.controller.js';
import { listVenueMatchesCON } from '../controllers/list_venue_matches.controller.js';
import { getVenueCourtAvailabilityCON } from '../controllers/court_availability.controller.js';
import { getCourtSlotsCON } from '../controllers/court_slots.controller.js';
import { postVenueGeocodeCON } from '../controllers/venue_geocoding.controller.js';
import { asyncHandler } from '../middleware/async_handler.js';
import { requireAuth } from '../middleware/auth.middleware.js';

export const VENUES_ROUTER = Router();

VENUES_ROUTER.get('/venues', asyncHandler(getVenuesCON));
VENUES_ROUTER.get('/venues/:venueId/courts', asyncHandler(getVenueCourtsCON));
VENUES_ROUTER.get('/venues/:venueId/courts/:courtId/slots', asyncHandler(getCourtSlotsCON));
VENUES_ROUTER.get('/venues/:venueId/availability', asyncHandler(getVenueCourtAvailabilityCON));
VENUES_ROUTER.post('/venues', asyncHandler(postVenueCON));
VENUES_ROUTER.post('/venues/:venueId/courts', asyncHandler(postCourtCON));
VENUES_ROUTER.put('/venues/:venueId/courts/:courtId', asyncHandler(putCourtCON));
VENUES_ROUTER.delete('/venues/:venueId/courts/:courtId', asyncHandler(deleteCourtCON));
VENUES_ROUTER.post('/venues/:venueId/geocode', asyncHandler(postVenueGeocodeCON));
VENUES_ROUTER.get('/venues/:venueId/payment-info', requireAuth, asyncHandler(getVenuePaymentInfoCON));
VENUES_ROUTER.get('/venues/:venueId/matches', requireAuth, asyncHandler(getVenueMatchesCON));
VENUES_ROUTER.get('/venues/:venueId/dashboard-stats', requireAuth, asyncHandler(getDashboardStatsCON));
VENUES_ROUTER.get('/venues/:venueId', requireAuth, asyncHandler(getVenueCON));
VENUES_ROUTER.get('/venues/:venueId/transactions/stats', requireAuth, asyncHandler(getTransactionStatsCON));
VENUES_ROUTER.get('/venues/:venueId/transactions/history', requireAuth, asyncHandler(getTransactionHistoryCON));
VENUES_ROUTER.patch('/venues/:venueId', requireAuth, asyncHandler(patchVenueCON));

