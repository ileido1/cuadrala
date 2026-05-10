import { Router } from 'express';

import {
  getVenuePendingTransactionsCON,
  getVenueStaffCON,
  patchConfirmVenueTransactionCON,
  postUpsertVenueStaffCON,
} from '../controllers/venue_staff.controller.js';
import { asyncHandler } from '../middleware/async_handler.js';
import { requireAuth } from '../middleware/auth.middleware.js';

export const VENUE_STAFF_ROUTER = Router();

VENUE_STAFF_ROUTER.post(
  '/venues/:venueId/staff',
  requireAuth,
  asyncHandler(postUpsertVenueStaffCON),
);

VENUE_STAFF_ROUTER.get(
  '/venues/:venueId/staff',
  asyncHandler(getVenueStaffCON),
);

VENUE_STAFF_ROUTER.get(
  '/venues/:venueId/transactions/pending',
  requireAuth,
  asyncHandler(getVenuePendingTransactionsCON),
);

VENUE_STAFF_ROUTER.patch(
  '/venues/:venueId/transactions/:transactionId/confirm',
  requireAuth,
  asyncHandler(patchConfirmVenueTransactionCON),
);
