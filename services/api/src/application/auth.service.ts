import bcrypt from 'bcryptjs';

import { AppError } from '../domain/errors/app_error.js';
import { PRISMA } from '../infrastructure/prisma_client.js';
import {
  ACCESS_TOKEN_EXPIRES_IN_SECONDS,
  signAccessTokenSV,
  signRefreshTokenSV,
  verifyRefreshTokenSV,
} from '../infrastructure/jwt_tokens.js';

const BCRYPT_ROUNDS = 10;

export async function registerUserSV(_email: string, _password: string, _name: string): Promise<{
  userId: string;
  email: string;
  name: string;
  subscriptionType: string;
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
}> {
  const EXISTING = await PRISMA.user.findUnique({ where: { email: _email.toLowerCase() } });
  if (EXISTING !== null) {
    throw new AppError('EMAIL_YA_REGISTRADO', 'Ya existe una cuenta con este correo.', 409);
  }

  const HASH = await bcrypt.hash(_password, BCRYPT_ROUNDS);
  const USER = await PRISMA.user.create({
    data: {
      email: _email.toLowerCase(),
      name: _name.trim(),
      passwordHash: HASH,
    },
  });

  const ACCESS = signAccessTokenSV(USER.id, USER.email);
  const REFRESH = signRefreshTokenSV(USER.id);

  return {
    userId: USER.id,
    email: USER.email,
    name: USER.name,
    subscriptionType: USER.subscriptionType,
    accessToken: ACCESS,
    refreshToken: REFRESH,
    expiresIn: ACCESS_TOKEN_EXPIRES_IN_SECONDS,
  };
}

export async function loginUserSV(_email: string, _password: string): Promise<{
  userId: string;
  email: string;
  name: string;
  subscriptionType: string;
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
}> {
  const USER = await PRISMA.user.findUnique({ where: { email: _email.toLowerCase() } });
  if (USER === null || USER.passwordHash === null) {
    throw new AppError('CREDENCIALES_INVALIDAS', 'Correo o contraseña incorrectos.', 401);
  }

  const MATCH = await bcrypt.compare(_password, USER.passwordHash);
  if (!MATCH) {
    throw new AppError('CREDENCIALES_INVALIDAS', 'Correo o contraseña incorrectos.', 401);
  }

  const ACCESS = signAccessTokenSV(USER.id, USER.email);
  const REFRESH = signRefreshTokenSV(USER.id);

  return {
    userId: USER.id,
    email: USER.email,
    name: USER.name,
    subscriptionType: USER.subscriptionType,
    accessToken: ACCESS,
    refreshToken: REFRESH,
    expiresIn: ACCESS_TOKEN_EXPIRES_IN_SECONDS,
  };
}

export async function refreshSessionSV(_refreshToken: string): Promise<{
  userId: string;
  email: string;
  name: string;
  subscriptionType: string;
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
}> {
  let PAYLOAD: { sub: string };
  try {
    PAYLOAD = verifyRefreshTokenSV(_refreshToken);
  } catch {
    throw new AppError('TOKEN_INVALIDO', 'Sesión inválida o expirada.', 401);
  }

  const USER = await PRISMA.user.findUnique({ where: { id: PAYLOAD.sub } });
  if (USER === null) {
    throw new AppError('TOKEN_INVALIDO', 'Sesión inválida o expirada.', 401);
  }

  const ACCESS = signAccessTokenSV(USER.id, USER.email);
  const REFRESH = signRefreshTokenSV(USER.id);

  return {
    userId: USER.id,
    email: USER.email,
    name: USER.name,
    subscriptionType: USER.subscriptionType,
    accessToken: ACCESS,
    refreshToken: REFRESH,
    expiresIn: ACCESS_TOKEN_EXPIRES_IN_SECONDS,
  };
}
