import { z } from 'zod';

export const TRANSACTION_ID_PARAM_SCHEMA = z.object({
  transactionId: z.string().uuid('transactionId debe ser un UUID valido.'),
});

export const TRANSACTION_RECEIPT_ID_PARAM_SCHEMA = z.object({
  transactionId: z.string().uuid('transactionId debe ser un UUID valido.'),
  receiptId: z.string().uuid('receiptId debe ser un UUID valido.'),
});

