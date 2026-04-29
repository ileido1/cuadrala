import { Router } from 'express';
import multer from 'multer';

import {
  getMatchTransactionsSummaryCON,
  getUserTransactionsCON,
  patchConfirmTransactionManualCON,
  patchUserSubscriptionCON,
  postCreateMatchObligationsCON,
} from '../controllers/monetization.controller.js';
import {
  getTransactionReceiptCON,
  postUploadTransactionReceiptCON,
} from '../controllers/transaction_receipts.controller.js';
import { AppError } from '../../domain/errors/app_error.js';
import { asyncHandler } from '../middleware/async_handler.js';
import { requireAuth } from '../middleware/auth.middleware.js';

const RECEIPT_UPLOAD = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (_req, _file, _cb) => {
    const ALLOWED = new Set(['image/jpeg', 'image/png', 'image/webp']);
    if (!ALLOWED.has(_file.mimetype)) {
      _cb(new AppError('VALIDACION_FALLIDA', 'Tipo de archivo no permitido. Solo jpeg/png/webp.', 400));
      return;
    }
    _cb(null, true);
  },
});

export const MONETIZATION_ROUTER = Router();

MONETIZATION_ROUTER.post(
  '/matches/:matchId/transactions/create-obligations',
  asyncHandler(postCreateMatchObligationsCON),
);
MONETIZATION_ROUTER.get(
  '/matches/:matchId/transactions/summary',
  asyncHandler(getMatchTransactionsSummaryCON),
);
MONETIZATION_ROUTER.patch(
  '/transactions/:transactionId/confirm-manual',
  asyncHandler(patchConfirmTransactionManualCON),
);
MONETIZATION_ROUTER.post(
  '/transactions/:transactionId/receipt',
  requireAuth,
  RECEIPT_UPLOAD.single('file'),
  asyncHandler(postUploadTransactionReceiptCON),
);
MONETIZATION_ROUTER.get(
  '/transactions/:transactionId/receipt/:receiptId',
  requireAuth,
  asyncHandler(getTransactionReceiptCON),
);
MONETIZATION_ROUTER.get('/users/:userId/transactions', asyncHandler(getUserTransactionsCON));
MONETIZATION_ROUTER.patch('/users/:userId/subscription', asyncHandler(patchUserSubscriptionCON));
