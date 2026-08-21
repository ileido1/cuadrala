import { z } from 'zod';

//? Mismo patrón usado en player_profile.validation.ts: formato E.164 (8 a 15 dígitos).
const GUEST_PHONE_REGEX = /^\+?\d{8,15}$/;

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

/** Slice 1 (tournament-guest-registration): invitar invitado sin cuenta de usuario. */
export const INVITE_GUEST_TOURNAMENT_PARTICIPANT_BODY_SCHEMA = z
  .object({
    name: z.string().min(1, 'name es requerido.').max(100, 'name no puede superar los 100 caracteres.'),
    phone: z.string().regex(GUEST_PHONE_REGEX, 'phone debe tener formato E.164 (8 a 15 dígitos).').optional(),
    email: z.string().email('email debe ser un correo válido.').optional(),
  })
  .strict();

export const TOURNAMENT_REGISTRATION_ID_PARAMS_SCHEMA = z
  .object({
    tournamentId: z.string().uuid('tournamentId debe ser un UUID valido.'),
    registrationId: z.string().uuid('registrationId debe ser un UUID valido.'),
  })
  .strict();

export const UPDATE_TOURNAMENT_REGISTRATION_STATUS_BODY_SCHEMA = z
  .object({
    status: z.literal('CONFIRMED'),
  })
  .strict();
