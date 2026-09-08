import { z } from 'zod';

export const CREATE_PARAMETRIZED_TOURNAMENT_BODY_SCHEMA = z
  .object({
    name: z.string().min(1, 'name es obligatorio.').max(200),
    categoryId: z.string().uuid('categoryId debe ser un UUID valido.'),
    sportId: z.string().uuid('sportId debe ser un UUID valido.'),
    formatPresetId: z.string().uuid('formatPresetId debe ser un UUID valido.').optional(),
    formatPresetCode: z
      .string()
      .min(1, 'formatPresetCode es obligatorio.')
      .max(50)
      .regex(/^[A-Z0-9_]+$/, 'formatPresetCode debe ser un código válido (A-Z, 0-9, _).')
      .optional(),
    formatParameters: z.record(z.string(), z.unknown()).optional(),
    startsAt: z.string().datetime({ offset: true }).optional(),
    visibility: z.enum(['PUBLIC', 'PRIVATE']).optional(),
    venueId: z.string().uuid('venueId debe ser un UUID valido.').optional(),
    //? Precio por jugador. 0 es un valor legitimo: "gratis" declarado no es lo
    //? mismo que "no lo declararon" (null).
    inscriptionPrice: z
      .number()
      .nonnegative('inscriptionPrice no puede ser negativo.')
      .max(999999.99, 'inscriptionPrice supera el maximo permitido.')
      .optional(),
    //? Minimo 2: con un solo cupo no hay torneo. El tope alto deja lugar a
    //? formatos grandes sin que el schema sea el que decide el producto.
    maxSlots: z
      .number()
      .int('maxSlots debe ser un entero.')
      .min(2, 'maxSlots debe ser al menos 2.')
      .max(256, 'maxSlots no puede superar 256.')
      .optional(),
    registrationClosesAt: z.string().datetime({ offset: true }).optional(),
  })
  .strict()
  .superRefine((_value, _ctx) => {
    if (_value.formatPresetId === undefined && _value.formatPresetCode === undefined) {
      _ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Debe enviar formatPresetId o formatPresetCode.',
        path: ['formatPresetId'],
      });
    }

    //? Una inscripcion que cierra despues de que el torneo arranco no cierra
    //? nada: el cliente mostraria "cierra VIE" con el torneo ya en juego.
    if (
      _value.startsAt !== undefined &&
      _value.registrationClosesAt !== undefined &&
      new Date(_value.registrationClosesAt).getTime() > new Date(_value.startsAt).getTime()
    ) {
      _ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'registrationClosesAt no puede ser posterior a startsAt.',
        path: ['registrationClosesAt'],
      });
    }
  });
