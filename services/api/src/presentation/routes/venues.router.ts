import { Router } from 'express';

import {
  getVenuesCON,
  getMyVenuesCON,
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
import { getVenueCourtAvailabilityCON } from '../controllers/court_availability.controller.js';
import { getCourtSlotsCON } from '../controllers/court_slots.controller.js';
import { postVenueGeocodeCON } from '../controllers/venue_geocoding.controller.js';
import {
  getCourtPricingTiersCON,
  postCourtPricingTierCON,
  putCourtPricingTierCON,
  deleteCourtPricingTierCON,
} from '../controllers/court_pricing.controller.js';
import { ENV_CONST } from '../../config/env.js';
import { asyncHandler } from '../middleware/async_handler.js';
import { requireAuth, requireSecret } from '../middleware/auth.middleware.js';

export const VENUES_ROUTER = Router();

VENUES_ROUTER.get('/venues', asyncHandler(getVenuesCON));
VENUES_ROUTER.get('/venues/mine', requireAuth, asyncHandler(getMyVenuesCON));
VENUES_ROUTER.get('/venues/:venueId/courts', asyncHandler(getVenueCourtsCON));
VENUES_ROUTER.get('/venues/:venueId/courts/:courtId/slots', asyncHandler(getCourtSlotsCON));
VENUES_ROUTER.get('/venues/:venueId/availability', asyncHandler(getVenueCourtAvailabilityCON));
VENUES_ROUTER.post('/venues', requireAuth, asyncHandler(postVenueCON));
VENUES_ROUTER.post('/venues/:venueId/courts', requireAuth, asyncHandler(postCourtCON));
VENUES_ROUTER.put('/venues/:venueId/courts/:courtId', requireAuth, asyncHandler(putCourtCON));
VENUES_ROUTER.delete('/venues/:venueId/courts/:courtId', requireAuth, asyncHandler(deleteCourtCON));
//? Endpoint de operación del worker de geocoding: se protege con el secreto
//? compartido, no con sesión de usuario.
VENUES_ROUTER.post(
  '/venues/:venueId/geocode',
  requireSecret('x-geo-secret', ENV_CONST.GEO_DISPATCH_SECRET),
  asyncHandler(postVenueGeocodeCON),
);
//? Tarifas por franja horaria de cancha.
VENUES_ROUTER.get(
  '/venues/:venueId/courts/:courtId/pricing-tiers',
  requireAuth,
  asyncHandler(getCourtPricingTiersCON),
);
VENUES_ROUTER.post(
  '/venues/:venueId/courts/:courtId/pricing-tiers',
  requireAuth,
  asyncHandler(postCourtPricingTierCON),
);
VENUES_ROUTER.put(
  '/venues/:venueId/courts/:courtId/pricing-tiers/:tierId',
  requireAuth,
  asyncHandler(putCourtPricingTierCON),
);
VENUES_ROUTER.delete(
  '/venues/:venueId/courts/:courtId/pricing-tiers/:tierId',
  requireAuth,
  asyncHandler(deleteCourtPricingTierCON),
);
VENUES_ROUTER.get(
  '/venues/:venueId/payment-info',
  requireAuth,
  asyncHandler(getVenuePaymentInfoCON),
);
VENUES_ROUTER.get('/venues/:venueId/matches', requireAuth, asyncHandler(getVenueMatchesCON));
VENUES_ROUTER.get(
  '/venues/:venueId/dashboard-stats',
  requireAuth,
  asyncHandler(getDashboardStatsCON),
);
VENUES_ROUTER.get('/venues/:venueId', requireAuth, asyncHandler(getVenueCON));
VENUES_ROUTER.get(
  '/venues/:venueId/transactions/stats',
  requireAuth,
  asyncHandler(getTransactionStatsCON),
);
VENUES_ROUTER.get(
  '/venues/:venueId/transactions/history',
  requireAuth,
  asyncHandler(getTransactionHistoryCON),
);
VENUES_ROUTER.patch('/venues/:venueId', requireAuth, asyncHandler(patchVenueCON));
