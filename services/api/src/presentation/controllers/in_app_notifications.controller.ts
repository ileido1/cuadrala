import type { Request, Response } from 'express';

import { AppError } from '../../domain/errors/app_error.js';
import {
  LIST_MY_IN_APP_NOTIFICATIONS_UC,
  MARK_ALL_MY_IN_APP_NOTIFICATIONS_READ_UC,
  MARK_MY_IN_APP_NOTIFICATION_READ_UC,
} from '../composition/notifications.composition.js';
import {
  IN_APP_NOTIFICATION_DELIVERY_ID_PARAM_SCHEMA,
  LIST_MY_IN_APP_NOTIFICATIONS_QUERY_SCHEMA,
} from '../validation/in_app_notifications.validation.js';

export async function getMyInAppNotificationsCON(_req: Request, _res: Response): Promise<void> {
  const USER_ID = _req.authUser?.id;
  if (USER_ID === undefined) {
    throw new AppError('NO_AUTORIZADO', 'Sesion no disponible.', 401);
  }

  const QUERY = LIST_MY_IN_APP_NOTIFICATIONS_QUERY_SCHEMA.parse(_req.query ?? {});

  const RESULT = await LIST_MY_IN_APP_NOTIFICATIONS_UC.executeSV({
    actorUserId: USER_ID,
    status: QUERY.status ?? 'unread',
    page: QUERY.page ?? 1,
    limit: QUERY.limit ?? 20,
  });

  _res.status(200).json({
    success: true,
    message: 'Notificaciones obtenidas correctamente.',
    data: RESULT,
  });
}

export async function patchMarkMyInAppNotificationReadCON(_req: Request, _res: Response): Promise<void> {
  const USER_ID = _req.authUser?.id;
  if (USER_ID === undefined) {
    throw new AppError('NO_AUTORIZADO', 'Sesion no disponible.', 401);
  }

  const PARAMS = IN_APP_NOTIFICATION_DELIVERY_ID_PARAM_SCHEMA.parse(_req.params);
  await MARK_MY_IN_APP_NOTIFICATION_READ_UC.executeSV(USER_ID, PARAMS.deliveryId, new Date());

  _res.status(200).json({
    success: true,
    message: 'Notificación marcada como leída.',
    data: { deliveryId: PARAMS.deliveryId },
  });
}

export async function patchMarkAllMyInAppNotificationsReadCON(_req: Request, _res: Response): Promise<void> {
  const USER_ID = _req.authUser?.id;
  if (USER_ID === undefined) {
    throw new AppError('NO_AUTORIZADO', 'Sesion no disponible.', 401);
  }

  const RESULT = await MARK_ALL_MY_IN_APP_NOTIFICATIONS_READ_UC.executeSV(USER_ID, new Date());

  _res.status(200).json({
    success: true,
    message: 'Notificaciones marcadas como leídas.',
    data: RESULT,
  });
}

