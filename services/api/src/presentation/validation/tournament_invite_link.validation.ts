import { z } from 'zod';

/**
 * Validaciones zod de `tournament-invite-link` (issue #47). Solo forma: los
 * rangos de negocio (`expiresAt` 1h-180d, `maxUses >= 1`) viven en los Use
 * Cases, no aquí (design.md, decisión #4).
 */

export const TOURNAMENT_INVITE_LINK_TOURNAMENT_PARAMS_SCHEMA = z
  .object({ tournamentId: z.string().uuid('tournamentId debe ser un UUID valido.') })
  .strict();

export const TOURNAMENT_INVITE_LINK_ID_PARAMS_SCHEMA = z
  .object({
    tournamentId: z.string().uuid('tournamentId debe ser un UUID valido.'),
    linkId: z.string().uuid('linkId debe ser un UUID valido.'),
  })
  .strict();

//? Mismo patrón que GUEST_SCHEDULE_TOKEN_PARAM_SCHEMA: 400 antes de tocar la
//? base de datos cuando el largo no es plausible (NFR-TIL-002).
export const TOURNAMENT_INVITE_LINK_TOKEN_PARAMS_SCHEMA = z
  .object({ token: z.string().min(40).max(200) })
  .strict();

export const CREATE_TOURNAMENT_INVITE_LINK_BODY_SCHEMA = z
  .object({
    expiresAt: z.coerce.date().optional(),
    maxUses: z.number().int().nullable().optional(),
  })
  .strict();

//? El body de invitado del registro vía link NO tiene schema propio: se
//? reusa INVITE_GUEST_TOURNAMENT_PARTICIPANT_BODY_SCHEMA tal cual (NFR-TIL-003),
//? ver `presentation/validation/tournament_registration.validation.ts`.
