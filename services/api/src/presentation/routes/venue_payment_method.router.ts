import { Router } from 'express';

import {
  deleteVenuePaymentMethodCON,
  getActiveVenuePaymentMethodsCON,
  getAllVenuePaymentMethodsCON,
  postVenuePaymentMethodCON,
  putVenuePaymentMethodCON,
} from '../controllers/venue_payment_methods.controller.js';
import { asyncHandler } from '../middleware/async_handler.js';
import { requireAuth } from '../middleware/auth.middleware.js';

export const VENUE_PAYMENT_METHOD_ROUTER = Router();

VENUE_PAYMENT_METHOD_ROUTER.get(
  '/venues/:venueId/payment-methods',
  asyncHandler(getActiveVenuePaymentMethodsCON),
);

VENUE_PAYMENT_METHOD_ROUTER.get(
  '/venues/:venueId/payment-methods/all',
  requireAuth,
  asyncHandler(getAllVenuePaymentMethodsCON),
);

VENUE_PAYMENT_METHOD_ROUTER.post(
  '/venues/:venueId/payment-methods',
  requireAuth,
  asyncHandler(postVenuePaymentMethodCON),
);

VENUE_PAYMENT_METHOD_ROUTER.put(
  '/venues/:venueId/payment-methods/:paymentMethodId',
  requireAuth,
  asyncHandler(putVenuePaymentMethodCON),
);

VENUE_PAYMENT_METHOD_ROUTER.delete(
  '/venues/:venueId/payment-methods/:paymentMethodId',
  requireAuth,
  asyncHandler(deleteVenuePaymentMethodCON),
);
