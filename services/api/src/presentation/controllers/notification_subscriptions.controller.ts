import type { Request, Response } from 'express';

import { AppError } from '../../domain/errors/app_error.js';
import {
  DISABLE_MY_NOTIFICATION_SUBSCRIPTION_UC,
  LIST_MY_NOTIFICATION_SUBSCRIPTIONS_UC,
  UPSERT_MY_NOTIFICATION_SUBSCRIPTION_UC,
} from '../composition/notifications.composition.js';
import {
  NOTIFICATION_SUBSCRIPTION_ID_PARAM_SCHEMA,
  UPSERT_NOTIFICATION_SUBSCRIPTION_BODY_SCHEMA,
} from '../validation/notification_subscriptions.validation.js';

export async function postUpsertMyNotificationSubscriptionCON(
  _req: Request,
  _res: Response,
): Promise<void> {
  const USER_ID = _req.authUser?.id;
  if (USER_ID === undefined) {
    throw new AppError('NO_AUTORIZADO', 'Sesion no disponible.', 401);
  }

  const BODY = UPSERT_NOTIFICATION_SUBSCRIPTION_BODY_SCHEMA.parse(_req.body);

  const SUBSCRIPTION = await UPSERT_MY_NOTIFICATION_SUBSCRIPTION_UC.executeSV({
    id: BODY.id,
    actorUserId: USER_ID,
    categoryId: BODY.categoryId ?? null,
    nearLat: BODY.nearLat ?? null,
    nearLng: BODY.nearLng ?? null,
    radiusKm: BODY.radiusKm ?? null,
    enabled: BODY.enabled,
    enabledTypes: BODY.enabledTypes ?? undefined,
  });

  _res.status(200).json({
    success: true,
    message: 'Suscripcion guardada correctamente.',
    data: SUBSCRIPTION,
  });
}

export async function getMyNotificationSubscriptionsCON(
  _req: Request,
  _res: Response,
): Promise<void> {
  const USER_ID = _req.authUser?.id;
  if (USER_ID === undefined) {
    throw new AppError('NO_AUTORIZADO', 'Sesion no disponible.', 401);
  }

  const ITEMS = await LIST_MY_NOTIFICATION_SUBSCRIPTIONS_UC.executeSV(USER_ID);

  _res.status(200).json({
    success: true,
    message: 'Suscripciones obtenidas correctamente.',
    data: ITEMS,
  });
}

export async function deleteMyNotificationSubscriptionCON(
  _req: Request,
  _res: Response,
): Promise<void> {
  const USER_ID = _req.authUser?.id;
  if (USER_ID === undefined) {
    throw new AppError('NO_AUTORIZADO', 'Sesion no disponible.', 401);
  }

  const PARAMS = NOTIFICATION_SUBSCRIPTION_ID_PARAM_SCHEMA.parse(_req.params);
  await DISABLE_MY_NOTIFICATION_SUBSCRIPTION_UC.executeSV(USER_ID, PARAMS.id);

  _res.status(204).send();
}

