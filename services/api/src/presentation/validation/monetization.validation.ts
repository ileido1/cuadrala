import { z } from 'zod';

import { MONEY_AMOUNT_SCHEMA } from './money.validation.js';

export { CURRENCY_CODE_SCHEMA, MONEY_AMOUNT_SCHEMA } from './money.validation.js';

export const MATCH_ID_PARAM_SCHEMA = z.object({
  matchId: z.string().uuid('matchId debe ser un UUID valido.'),
});

export const RESERVATION_ID_PARAM_SCHEMA = z.object({
  reservationId: z.string().uuid('reservationId debe ser un UUID valido.'),
});

export const TRANSACTION_ID_PARAM_SCHEMA = z.object({
  transactionId: z.string().uuid('transactionId debe ser un UUID valido.'),
});

export const USER_ID_PARAM_SCHEMA = z.object({
  userId: z.string().uuid('userId debe ser un UUID valido.'),
});

export const CREATE_OBLIGATIONS_BODY_SCHEMA = z
  .object({
    amountBasePerPerson: z.number().positive('amountBasePerPerson debe ser un numero positivo.'),
    participantUserIds: z
      .array(z.string().uuid('Cada participante debe ser un UUID valido.'))
      .optional(),
  })
  .strict();

export const REJECT_TRANSACTION_BODY_SCHEMA = z
  .object({
    reason: z.string().min(1, 'reason es requerido para rechazar.').max(500),
  })
  .strict();

export const UPDATE_SUBSCRIPTION_BODY_SCHEMA = z
  .object({
    subscriptionType: z.enum(['FREE', 'PRO'], {
      message: 'subscriptionType debe ser FREE o PRO.',
    }),
  })
  .strict();

/** Query opcional para listar transacciones del usuario (paginación simple por límite). */
export const USER_TRANSACTIONS_QUERY_SCHEMA = z.object({
  limit: z.coerce.number().int().min(1).max(100).default(50),
});

/** ID de medio de pago opcional (acepta UUID y ids legacy del seed). */
function optionalPaymentMethodIdField() {
  return z.preprocess(
    (val) => (val === '' || val === null || val === undefined ? undefined : val),
    z
      .string()
      .min(1, 'venuePaymentMethodId no puede estar vacio.')
      .max(64)
      .optional(),
  );
}

/** Body: jugador registra el medio de pago elegido antes de subir comprobante. */
export const RECORD_PLAYER_PAYMENT_SELECTION_BODY_SCHEMA = z
  .object({
    venuePaymentMethodId: optionalPaymentMethodIdField(),
    paymentMethodType: z
      .string()
      .min(1)
      .max(32)
      .optional(),
  })
  .strict()
  .refine(
    (body) =>
      body.venuePaymentMethodId !== undefined
      || body.paymentMethodType !== undefined,
    { message: 'Indicá venuePaymentMethodId o paymentMethodType.' },
  );

/** Body para confirmar una transacción manualmente con datos de pago. */
export const CONFIRM_TRANSACTION_BODY_SCHEMA = z
  .object({
    venuePaymentMethodId: optionalPaymentMethodIdField(),
    settlementAmount: MONEY_AMOUNT_SCHEMA.optional(),
    referenceNumber: z.string().max(200).optional(),
    paymentData: z.record(z.string(), z.unknown()).optional(),
  })
  .strict();
