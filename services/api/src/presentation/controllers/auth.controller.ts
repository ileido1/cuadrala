import type { Request, Response } from 'express';

import { loginUserSV, refreshSessionSV, registerUserSV } from '../../application/auth.service.js';
import {
  LOGIN_BODY_SCHEMA,
  REFRESH_BODY_SCHEMA,
  REGISTER_BODY_SCHEMA,
} from '../validation/auth.validation.js';

export async function postRegisterCON(_req: Request, _res: Response): Promise<void> {
  const BODY = REGISTER_BODY_SCHEMA.parse(_req.body);
  const RESULT = await registerUserSV(BODY.email, BODY.password, BODY.name);

  _res.status(201).json({
    success: true,
    message: 'Cuenta creada correctamente.',
    data: {
      user: {
        id: RESULT.userId,
        email: RESULT.email,
        name: RESULT.name,
        subscriptionType: RESULT.subscriptionType,
      },
      accessToken: RESULT.accessToken,
      refreshToken: RESULT.refreshToken,
      expiresIn: RESULT.expiresIn,
    },
  });
}

export async function postLoginCON(_req: Request, _res: Response): Promise<void> {
  const BODY = LOGIN_BODY_SCHEMA.parse(_req.body);
  const RESULT = await loginUserSV(BODY.email, BODY.password);

  _res.status(200).json({
    success: true,
    message: 'Sesion iniciada correctamente.',
    data: {
      user: {
        id: RESULT.userId,
        email: RESULT.email,
        name: RESULT.name,
        subscriptionType: RESULT.subscriptionType,
      },
      accessToken: RESULT.accessToken,
      refreshToken: RESULT.refreshToken,
      expiresIn: RESULT.expiresIn,
    },
  });
}

export async function postRefreshCON(_req: Request, _res: Response): Promise<void> {
  const BODY = REFRESH_BODY_SCHEMA.parse(_req.body);
  const RESULT = await refreshSessionSV(BODY.refreshToken);

  _res.status(200).json({
    success: true,
    message: 'Tokens renovados correctamente.',
    data: {
      user: {
        id: RESULT.userId,
        email: RESULT.email,
        name: RESULT.name,
        subscriptionType: RESULT.subscriptionType,
      },
      accessToken: RESULT.accessToken,
      refreshToken: RESULT.refreshToken,
      expiresIn: RESULT.expiresIn,
    },
  });
}
