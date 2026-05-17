import type { Request, Response } from 'express';

import { AppError } from '../../domain/errors/app_error.js';
import {
  CONFIRM_TRANSACTION_AS_VENUE_STAFF_UC,
  CREATE_MATCH_OBLIGATION_UC,
  CREATE_RESERVATION_OBLIGATION_UC,
  GET_MATCH_TRANSACTIONS_SUMMARY_UC,
  GET_RESERVATION_PAYMENT_SUMMARY_UC,
  LIST_USER_TRANSACTIONS_UC,
  REJECT_TRANSACTION_AS_VENUE_STAFF_UC,
  UPDATE_USER_SUBSCRIPTION_UC,
} from '../composition/monetization.composition.js';
import {
  CONFIRM_TRANSACTION_BODY_SCHEMA,
  CREATE_OBLIGATIONS_BODY_SCHEMA,
  MATCH_ID_PARAM_SCHEMA,
  REJECT_TRANSACTION_BODY_SCHEMA,
  RESERVATION_ID_PARAM_SCHEMA,
  TRANSACTION_ID_PARAM_SCHEMA,
  UPDATE_SUBSCRIPTION_BODY_SCHEMA,
  USER_ID_PARAM_SCHEMA,
  USER_TRANSACTIONS_QUERY_SCHEMA,
} from '../validation/monetization.validation.js';

export async function postCreateMatchObligationsCON(_req: Request, _res: Response): Promise<void> {
  const PARAMS = MATCH_ID_PARAM_SCHEMA.parse(_req.params);
  const BODY = CREATE_OBLIGATIONS_BODY_SCHEMA.parse(_req.body);

  const RESULT = await CREATE_MATCH_OBLIGATION_UC.executeSV({
    matchId: PARAMS.matchId,
    amountBasePerPerson: BODY.amountBasePerPerson,
    ...(BODY.participantUserIds !== undefined
      ? { participantUserIds: BODY.participantUserIds }
      : {}),
  });

  _res.status(201).json({
    success: true,
    message: 'Obligaciones registradas correctamente.',
    data: RESULT,
  });
}

export async function patchConfirmTransactionManualCON(
  _req: Request,
  _res: Response,
): Promise<void> {
  const ACTOR_USER_ID = _req.authUser?.id;
  if (ACTOR_USER_ID === undefined) {
    throw new AppError('NO_AUTORIZADO', 'Sesion no disponible.', 401);
  }

  const PARAMS = TRANSACTION_ID_PARAM_SCHEMA.parse(_req.params);
  const BODY = CONFIRM_TRANSACTION_BODY_SCHEMA.parse(_req.body ?? {});

  const RESULT = await CONFIRM_TRANSACTION_AS_VENUE_STAFF_UC.executeSV({
    transactionId: PARAMS.transactionId,
    userId: ACTOR_USER_ID,
    venuePaymentMethodId: BODY.venuePaymentMethodId,
    referenceNumber: BODY.referenceNumber,
    paymentData: BODY.paymentData,
  });

  _res.status(200).json({
    success: true,
    message: 'Pago confirmado correctamente.',
    data: RESULT,
  });
}

export async function getMatchTransactionsSummaryCON(_req: Request, _res: Response): Promise<void> {
  const PARAMS = MATCH_ID_PARAM_SCHEMA.parse(_req.params);
  const RESULT = await GET_MATCH_TRANSACTIONS_SUMMARY_UC.executeSV(PARAMS.matchId);

  _res.status(200).json({
    success: true,
    message: 'Resumen obtenido correctamente.',
    data: RESULT,
  });
}

export async function patchUserSubscriptionCON(_req: Request, _res: Response): Promise<void> {
  const PARAMS = USER_ID_PARAM_SCHEMA.parse(_req.params);
  const BODY = UPDATE_SUBSCRIPTION_BODY_SCHEMA.parse(_req.body);

  const RESULT = await UPDATE_USER_SUBSCRIPTION_UC.executeSV(
    PARAMS.userId,
    BODY.subscriptionType,
  );

  _res.status(200).json({
    success: true,
    message: 'Suscripcion actualizada correctamente.',
    data: RESULT,
  });
}

export async function getUserTransactionsCON(_req: Request, _res: Response): Promise<void> {
  const PARAMS = USER_ID_PARAM_SCHEMA.parse(_req.params);
  const QUERY = USER_TRANSACTIONS_QUERY_SCHEMA.parse(_req.query);

  const RESULT = await LIST_USER_TRANSACTIONS_UC.executeSV(PARAMS.userId, QUERY.limit);

  _res.status(200).json({
    success: true,
    message: 'Transacciones obtenidas correctamente.',
    data: RESULT,
  });
}

export async function postCreateReservationObligationsCON(
  _req: Request,
  _res: Response,
): Promise<void> {
  const PARAMS = RESERVATION_ID_PARAM_SCHEMA.parse(_req.params);
  const BODY = CREATE_OBLIGATIONS_BODY_SCHEMA.parse(_req.body);

  const RESULT = await CREATE_RESERVATION_OBLIGATION_UC.executeSV({
    reservationId: PARAMS.reservationId,
    amountBasePerPerson: BODY.amountBasePerPerson,
    ...(BODY.participantUserIds !== undefined
      ? { participantUserIds: BODY.participantUserIds }
      : {}),
  });

  _res.status(201).json({
    success: true,
    message: 'Obligaciones de reserva registradas correctamente.',
    data: RESULT,
  });
}

export async function getReservationPaymentSummaryCON(
  _req: Request,
  _res: Response,
): Promise<void> {
  const PARAMS = RESERVATION_ID_PARAM_SCHEMA.parse(_req.params);
  const RESULT = await GET_RESERVATION_PAYMENT_SUMMARY_UC.executeSV(PARAMS.reservationId);

  _res.status(200).json({
    success: true,
    message: 'Resumen de pago de reserva obtenido correctamente.',
    data: RESULT,
  });
}

export async function patchRejectTransactionManualCON(
  _req: Request,
  _res: Response,
): Promise<void> {
  const ACTOR_USER_ID = _req.authUser?.id;
  if (ACTOR_USER_ID === undefined) {
    throw new AppError('NO_AUTORIZADO', 'Sesion no disponible.', 401);
  }

  const PARAMS = TRANSACTION_ID_PARAM_SCHEMA.parse(_req.params);
  REJECT_TRANSACTION_BODY_SCHEMA.parse(_req.body ?? {});

  const RESULT = await REJECT_TRANSACTION_AS_VENUE_STAFF_UC.executeSV({
    transactionId: PARAMS.transactionId,
    userId: ACTOR_USER_ID,
  });

  _res.status(200).json({
    success: true,
    message: 'Transaccion rechazada.',
    data: RESULT,
  });
}
