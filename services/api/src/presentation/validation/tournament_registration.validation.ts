import { z } from 'zod';

export const TOURNAMENT_REGISTRATION_PARAMS_SCHEMA = z
  .object({
    tournamentId: z.string().uuid('tournamentId debe ser un UUID valido.'),
  })
  .strict();

export const CREATE_TOURNAMENT_REGISTRATION_BODY_SCHEMA = z
  .object({
    userId: z.string().uuid('userId debe ser un UUID valido.'),
  })
  .strict();

export const WITHDRAW_TOURNAMENT_REGISTRATION_PARAMS_SCHEMA = z
  .object({
    tournamentId: z.string().uuid('tournamentId debe ser un UUID valido.'),
    userId: z.string().uuid('userId debe ser un UUID valido.'),
  })
  .strict();
