import type { Request, Response } from 'express';

import { AppError } from '../../domain/errors/app_error.js';
import {
  GET_MY_LOCATION_UC,
  GET_MY_ONBOARDING_STATUS_UC,
  LIST_MY_AVAILABILITY_UC,
  LIST_MY_SPORT_PROFILES_UC,
  REPLACE_MY_AVAILABILITY_UC,
  REPLACE_MY_SPORT_PROFILES_UC,
  UPSERT_MY_LOCATION_UC,
} from '../composition/onboarding.composition.js';
import {
  REPLACE_AVAILABILITY_BODY_SCHEMA,
  REPLACE_SPORT_PROFILES_BODY_SCHEMA,
  UPSERT_LOCATION_BODY_SCHEMA,
} from '../validation/onboarding.validation.js';

function ensureUserId(_req: Request): string {
  const ID = _req.authUser?.id;
  if (ID === undefined) {
    throw new AppError('NO_AUTORIZADO', 'Sesion no disponible.', 401);
  }
  return ID;
}

export async function getMySportProfilesCON(_req: Request, _res: Response): Promise<void> {
  const USER_ID = ensureUserId(_req);
  const ITEMS = await LIST_MY_SPORT_PROFILES_UC.executeSV(USER_ID);
  _res.status(200).json({
    success: true,
    message: 'Perfiles deportivos obtenidos correctamente.',
    data: { items: ITEMS },
  });
}

export async function putMySportProfilesCON(_req: Request, _res: Response): Promise<void> {
  const USER_ID = ensureUserId(_req);
  const BODY = REPLACE_SPORT_PROFILES_BODY_SCHEMA.parse(_req.body);
  const NORMALIZED = BODY.items.map((_i) => ({
    sportId: _i.sportId,
    skillLevel: _i.skillLevel,
    ...(_i.sidePreference !== undefined ? { sidePreference: _i.sidePreference } : {}),
  }));
  const ITEMS = await REPLACE_MY_SPORT_PROFILES_UC.executeSV(USER_ID, NORMALIZED);
  _res.status(200).json({
    success: true,
    message: 'Perfiles deportivos actualizados correctamente.',
    data: { items: ITEMS },
  });
}

export async function getMyAvailabilityCON(_req: Request, _res: Response): Promise<void> {
  const USER_ID = ensureUserId(_req);
  const ITEMS = await LIST_MY_AVAILABILITY_UC.executeSV(USER_ID);
  _res.status(200).json({
    success: true,
    message: 'Disponibilidad obtenida correctamente.',
    data: { items: ITEMS },
  });
}

export async function putMyAvailabilityCON(_req: Request, _res: Response): Promise<void> {
  const USER_ID = ensureUserId(_req);
  const BODY = REPLACE_AVAILABILITY_BODY_SCHEMA.parse(_req.body);
  const ITEMS = await REPLACE_MY_AVAILABILITY_UC.executeSV(USER_ID, BODY.items);
  _res.status(200).json({
    success: true,
    message: 'Disponibilidad actualizada correctamente.',
    data: { items: ITEMS },
  });
}

export async function getMyLocationCON(_req: Request, _res: Response): Promise<void> {
  const USER_ID = ensureUserId(_req);
  const LOCATION = await GET_MY_LOCATION_UC.executeSV(USER_ID);
  _res.status(200).json({
    success: true,
    message: 'Ubicación obtenida correctamente.',
    data: { location: LOCATION },
  });
}

export async function putMyLocationCON(_req: Request, _res: Response): Promise<void> {
  const USER_ID = ensureUserId(_req);
  const BODY = UPSERT_LOCATION_BODY_SCHEMA.parse(_req.body);
  const PATCH = {
    latitude: BODY.latitude,
    longitude: BODY.longitude,
    radiusKm: BODY.radiusKm,
    ...(BODY.label !== undefined ? { label: BODY.label } : {}),
  };
  const LOCATION = await UPSERT_MY_LOCATION_UC.executeSV(USER_ID, PATCH);
  _res.status(200).json({
    success: true,
    message: 'Ubicación actualizada correctamente.',
    data: { location: LOCATION },
  });
}

export async function getMyOnboardingStatusCON(_req: Request, _res: Response): Promise<void> {
  const USER_ID = ensureUserId(_req);
  const STATUS = await GET_MY_ONBOARDING_STATUS_UC.executeSV(USER_ID);
  _res.status(200).json({
    success: true,
    message: 'Estado de onboarding obtenido correctamente.',
    data: STATUS,
  });
}
