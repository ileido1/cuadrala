import { z } from 'zod';

export const MATCH_ID_PARAM_SCHEMA = z.object({
  matchId: z.string().uuid('matchId debe ser un UUID valido.'),
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
