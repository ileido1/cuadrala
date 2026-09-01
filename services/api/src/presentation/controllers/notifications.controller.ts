import type { Request, Response } from 'express';

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

/**
 * @name    :postDispatchNotificationsCON
 * @version :2.0.0
 * @description :Corre un tick del worker de notificaciones. La autorización la
 * resuelve `requireSecret('x-dispatch-secret')` en el router.
 * @param {Request} _req - Request de Express
 * @param {Response} _res - Response de Express
 * @return {Promise<void>}
 */
export async function postDispatchNotificationsCON(_req: Request, _res: Response): Promise<void> {
  const BODY = DISPATCH_NOTIFICATIONS_BODY_SCHEMA.parse(_req.body ?? {});
  const RESULT = await DISPATCH_NOTIFICATIONS_UC.executeSV(
    BODY.limitEvents,
    BODY.limitDeliveries,
    BODY.limitTokens,
  );

  _res.status(200).json({
    success: true,
    message: 'Dispatch ejecutado correctamente.',
    data: RESULT,
  });
}

/**
 * @name    :getNotificationsMetricsCON
 * @version :1.0.0
 * @description :Devuelve el snapshot de métricas del worker de notificaciones. La autorización la
 * resuelve `requireSecret('x-dispatch-secret')` en el router.
 * @param {Request} _req - Request de Express
 * @param {Response} _res - Response de Express
 * @return {Promise<void>}
 */
export async function getNotificationsMetricsCON(_req: Request, _res: Response): Promise<void> {
  _res.status(200).json({
    success: true,
    message: 'Métricas consultadas correctamente.',
    data: NOTIFICATIONS_METRICS.snapshotSV(),
  });
}

/**
 * @name    :postCreateMatchCancelledNotificationEventCON
 * @version :1.0.0
 * @description :Encola el evento de partido cancelado para los usuarios dados. La autorización la
 * resuelve `requireSecret('x-dispatch-secret')` en el router.
 * @param {Request} _req - Request de Express
 * @param {Response} _res - Response de Express
 * @return {Promise<void>}
 */
export async function postCreateMatchCancelledNotificationEventCON(
  _req: Request,
  _res: Response,
): Promise<void> {
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

/**
 * @name    :postCreatePaymentPendingNotificationEventCON
 * @version :1.0.0
 * @description :Encola el evento de pago pendiente para los usuarios dados. La autorización la
 * resuelve `requireSecret('x-dispatch-secret')` en el router.
 * @param {Request} _req - Request de Express
 * @param {Response} _res - Response de Express
 * @return {Promise<void>}
 */
export async function postCreatePaymentPendingNotificationEventCON(
  _req: Request,
  _res: Response,
): Promise<void> {
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

/**
 * @name    :postCreateChatMessageNotificationEventCON
 * @version :1.0.0
 * @description :Encola el evento de mensaje de chat para los usuarios dados. La autorización la
 * resuelve `requireSecret('x-dispatch-secret')` en el router.
 * @param {Request} _req - Request de Express
 * @param {Response} _res - Response de Express
 * @return {Promise<void>}
 */
export async function postCreateChatMessageNotificationEventCON(
  _req: Request,
  _res: Response,
): Promise<void> {
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
