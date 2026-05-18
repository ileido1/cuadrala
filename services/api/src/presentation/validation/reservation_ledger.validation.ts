import { z } from 'zod';

import { MONEY_AMOUNT_SCHEMA } from './money.validation.js';
import {
  RESERVATION_ID_PARAM_SCHEMA,
  VENUE_ID_PARAM_SCHEMA,
} from './reservations.validation.js';

export const COMPENSATORY_LEDGER_PARAMS_SCHEMA = VENUE_ID_PARAM_SCHEMA.merge(
  RESERVATION_ID_PARAM_SCHEMA,
);

export const COMPENSATORY_LEDGER_BODY_SCHEMA = z
  .object({
    amount: MONEY_AMOUNT_SCHEMA,
    amountBsMinor: z
      .union([
        z.string().regex(/^\d+$/, 'amountBsMinor debe ser un entero no negativo.'),
        z.number().int().nonnegative(),
      ])
      .transform(String),
    reason: z
      .string()
      .trim()
      .min(3, 'reason debe tener al menos 3 caracteres.')
      .max(500, 'reason no puede superar 500 caracteres.'),
  })
  .strict();
