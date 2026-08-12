import type { Request, Response } from 'express';

import { AppError } from '../../domain/errors/app_error.js';
import {
  DISABLE_MY_DEVICE_PUSH_TOKEN_UC,
  LIST_MY_DEVICE_PUSH_TOKENS_UC,
  UPSERT_MY_DEVICE_PUSH_TOKEN_UC,
} from '../composition/device_push_tokens.composition.js';
import {
  DEVICE_PUSH_TOKEN_ID_PARAMS_SCHEMA,
  UPSERT_MY_DEVICE_PUSH_TOKEN_BODY_SCHEMA,
} from '../validation/device_push_tokens.validation.js';

function getAuthUserIdSV(_req: Request): string {
  const USER_ID = _req.authUser?.id;
  if (USER_ID === undefined) {
    throw new AppError('NO_AUTORIZADO', 'Sesion no disponible.', 401);
  }
  return USER_ID;
}

export async function getMyDevicePushTokensCON(_req: Request, _res: Response): Promise<void> {
  const TOKENS = await LIST_MY_DEVICE_PUSH_TOKENS_UC.executeSV(getAuthUserIdSV(_req));

  _res.status(200).json({
    success: true,
    message: 'Tokens obtenidos correctamente.',
    data: TOKENS,
  });
}

export async function postUpsertMyDevicePushTokenCON(_req: Request, _res: Response): Promise<void> {
  const BODY = UPSERT_MY_DEVICE_PUSH_TOKEN_BODY_SCHEMA.parse(_req.body ?? {});
  const TOKEN = await UPSERT_MY_DEVICE_PUSH_TOKEN_UC.executeSV(getAuthUserIdSV(_req), BODY);

  _res.status(200).json({
    success: true,
    message: 'Token actualizado correctamente.',
    data: TOKEN,
  });
}

export async function deleteMyDevicePushTokenCON(_req: Request, _res: Response): Promise<void> {
  const PARAMS = DEVICE_PUSH_TOKEN_ID_PARAMS_SCHEMA.parse(_req.params);
  await DISABLE_MY_DEVICE_PUSH_TOKEN_UC.executeSV(getAuthUserIdSV(_req), PARAMS.id);
  _res.status(204).send();
}

