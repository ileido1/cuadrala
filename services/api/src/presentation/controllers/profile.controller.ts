import type { Request, Response } from 'express';

import { getProfileByUserIdSV, updateProfileByUserIdSV } from '../../application/profile.service.js';
import { AppError } from '../../domain/errors/app_error.js';
import { PATCH_PROFILE_BODY_SCHEMA } from '../validation/profile.validation.js';

export async function getProfileCON(_req: Request, _res: Response): Promise<void> {
  const USER_ID = _req.authUser?.id;
  if (USER_ID === undefined) {
    throw new AppError('NO_AUTORIZADO', 'Sesion no disponible.', 401);
  }

  const PROFILE = await getProfileByUserIdSV(USER_ID);

  _res.status(200).json({
    success: true,
    message: 'Perfil obtenido correctamente.',
    data: { user: PROFILE },
  });
}

export async function patchProfileCON(_req: Request, _res: Response): Promise<void> {
  const USER_ID = _req.authUser?.id;
  if (USER_ID === undefined) {
    throw new AppError('NO_AUTORIZADO', 'Sesion no disponible.', 401);
  }

  const BODY = PATCH_PROFILE_BODY_SCHEMA.parse(_req.body);
  const PROFILE = await updateProfileByUserIdSV(USER_ID, BODY.name);

  _res.status(200).json({
    success: true,
    message: 'Perfil actualizado correctamente.',
    data: { user: PROFILE },
  });
}
