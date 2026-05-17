import { z } from 'zod';

export const CURRENCY_CODE_SCHEMA = z.enum(['BS', 'USD', 'EUR'], {
  message: 'currencyCode debe ser BS, USD o EUR.',
});

export const MONEY_AMOUNT_SCHEMA = z
  .object({
    amountMinor: z
      .union([
        z.string().regex(/^\d+$/, 'amountMinor debe ser un entero no negativo.'),
        z.number().int().nonnegative(),
      ])
      .transform(String),
    currencyCode: CURRENCY_CODE_SCHEMA,
  })
  .strict();

export type ParsedMoneyAmount = z.infer<typeof MONEY_AMOUNT_SCHEMA>;
