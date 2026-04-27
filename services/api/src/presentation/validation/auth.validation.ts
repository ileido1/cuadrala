import { z } from 'zod';

export const REGISTER_BODY_SCHEMA = z
  .object({
    email: z.string().email('email debe ser un correo valido.'),
    password: z.string().min(8, 'La contraseña debe tener al menos 8 caracteres.').max(128),
    name: z.string().min(1, 'name es obligatorio.').max(200),
  })
  .strict();

export const LOGIN_BODY_SCHEMA = z
  .object({
    email: z.string().email('email debe ser un correo valido.'),
    password: z.string().min(1, 'password es obligatorio.'),
  })
  .strict();

export const REFRESH_BODY_SCHEMA = z
  .object({
    refreshToken: z.string().min(1, 'refreshToken es obligatorio.'),
  })
  .strict();
