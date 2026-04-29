import type { Request, Response } from 'express';

import { AppError } from '../../domain/errors/app_error.js';
import { ENV_CONST } from '../../config/env.js';
import {
  CREATE_MATCH_CANCELLED_NOTIFICATION_EVENT_UC,
  CREATE_CHAT_MESSAGE_NOTIFICATION_EVENT_UC,
  CREATE_PAYMENT_PENDING_NOTIFICATION_EVENT_UC,
  DISPATCH_NOTIFICATIONS_UC,
} from '../composition/notifications.composition.js';
import {
  CREATE_CHAT_MESSAGE_NOTIFICATION_EVENT_BODY_SCHEMA,
  CREATE_MATCH_CANCELLED_NOTIFICATION_EVENT_BODY_SCHEMA,
  CREATE_PAYMENT_PENDING_NOTIFICATION_EVENT_BODY_SCHEMA,
  DISPATCH_NOTIFICATIONS_BODY_SCHEMA,
} from '../validation/notifications.validation.js';
import { NOTIFICATIONS_METRICS } from '../observability/notifications_metrics.js';

export async function postDispatchNotificationsCON(_req: Request, _res: Response): Promise<void> {
  const SECRET = _req.header('x-dispatch-secret');
  if (SECRET === undefined || SECRET !== ENV_CONST.NOTIFICATIONS_DISPATCH_SECRET) {
    throw new AppError('NO_AUTORIZADO', 'Secret invalido.', 401);
  }

  const BODY = DISPATCH_NOTIFICATIONS_BODY_SCHEMA.parse(_req.body ?? {});
  const RESULT = await DISPATCH_NOTIFICATIONS_UC.executeSV(
    BODY.limitEvents ?? 100,
    BODY.limitDeliveries ?? 1000,
    BODY.limitTokens ?? Number.POSITIVE_INFINITY,
  );

  _res.status(200).json({
    success: true,
    message: 'Dispatch ejecutado correctamente.',
    data: RESULT,
  });
}

export async function getNotificationsMetricsCON(_req: Request, _res: Response): Promise<void> {
  const SECRET = _req.header('x-dispatch-secret');
  if (SECRET === undefined || SECRET !== ENV_CONST.NOTIFICATIONS_DISPATCH_SECRET) {
    throw new AppError('NO_AUTORIZADO', 'Secret invalido.', 401);
  }

  _res.status(200).json({
    success: true,
    message: 'Métricas consultadas correctamente.',
    data: NOTIFICATIONS_METRICS.snapshotSV(),
  });
}

export async function postCreateMatchCancelledNotificationEventCON(
  _req: Request,
  _res: Response,
): Promise<void> {
  const SECRET = _req.header('x-dispatch-secret');
  if (SECRET === undefined || SECRET !== ENV_CONST.NOTIFICATIONS_DISPATCH_SECRET) {
    throw new AppError('NO_AUTORIZADO', 'Secret invalido.', 401);
  }

  const BODY = CREATE_MATCH_CANCELLED_NOTIFICATION_EVENT_BODY_SCHEMA.parse(_req.body ?? {});
  const RESULT = await CREATE_MATCH_CANCELLED_NOTIFICATION_EVENT_UC.executeSV({
    matchId: BODY.matchId,
    categoryId: BODY.categoryId,
    payload: BODY.payload ?? {},
    userIds: BODY.userIds,
  });

  _res.status(201).json({
    success: true,
    message: 'Evento creado correctamente.',
    data: RESULT,
  });
}

export async function postCreatePaymentPendingNotificationEventCON(
  _req: Request,
  _res: Response,
): Promise<void> {
  const SECRET = _req.header('x-dispatch-secret');
  if (SECRET === undefined || SECRET !== ENV_CONST.NOTIFICATIONS_DISPATCH_SECRET) {
    throw new AppError('NO_AUTORIZADO', 'Secret invalido.', 401);
  }

  const BODY = CREATE_PAYMENT_PENDING_NOTIFICATION_EVENT_BODY_SCHEMA.parse(_req.body ?? {});
  const RESULT = await CREATE_PAYMENT_PENDING_NOTIFICATION_EVENT_UC.executeSV({
    matchId: BODY.matchId,
    categoryId: BODY.categoryId,
    payload: BODY.payload ?? {},
    userIds: BODY.userIds,
  });

  _res.status(201).json({
    success: true,
    message: 'Evento creado correctamente.',
    data: RESULT,
  });
}

export async function postCreateChatMessageNotificationEventCON(
  _req: Request,
  _res: Response,
): Promise<void> {
  const SECRET = _req.header('x-dispatch-secret');
  if (SECRET === undefined || SECRET !== ENV_CONST.NOTIFICATIONS_DISPATCH_SECRET) {
    throw new AppError('NO_AUTORIZADO', 'Secret invalido.', 401);
  }

  const BODY = CREATE_CHAT_MESSAGE_NOTIFICATION_EVENT_BODY_SCHEMA.parse(_req.body ?? {});
  const RESULT = await CREATE_CHAT_MESSAGE_NOTIFICATION_EVENT_UC.executeSV({
    matchId: BODY.matchId,
    categoryId: BODY.categoryId,
    payload: BODY.payload ?? {},
    userIds: BODY.userIds,
  });

  _res.status(201).json({
    success: true,
    message: 'Evento creado correctamente.',
    data: RESULT,
  });
}

