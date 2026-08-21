import { z } from 'zod';

export const TOURNAMENT_INVITATION_PARAMS_SCHEMA = z
  .object({
    tournamentId: z.string().uuid('tournamentId debe ser un UUID valido.'),
  })
  .strict();

export const CREATE_TOURNAMENT_INVITATION_BODY_SCHEMA = z
  .object({
    userId: z.string().uuid('userId debe ser un UUID valido.'),
  })
  .strict();

export const TOURNAMENT_INVITATION_ID_PARAMS_SCHEMA = z
  .object({
    tournamentId: z.string().uuid('tournamentId debe ser un UUID valido.'),
    invitationId: z.string().uuid('invitationId debe ser un UUID valido.'),
  })
  .strict();

export const RESPOND_TOURNAMENT_INVITATION_BODY_SCHEMA = z
  .object({
    action: z.enum(['ACCEPT', 'REJECT']),
  })
  .strict();
