import type { Request, Response } from 'express';

import {
  confirmTransactionManualSV,
  createMatchObligationsSV,
  getMatchTransactionsSummarySV,
  listUserTransactionsSV,
  updateUserSubscriptionSV,
} from '../../application/monetization.service.js';
import {
  CREATE_OBLIGATIONS_BODY_SCHEMA,
  MATCH_ID_PARAM_SCHEMA,
  TRANSACTION_ID_PARAM_SCHEMA,
  UPDATE_SUBSCRIPTION_BODY_SCHEMA,
  USER_ID_PARAM_SCHEMA,
  USER_TRANSACTIONS_QUERY_SCHEMA,
} from '../validation/monetization.validation.js';

export async function postCreateMatchObligationsCON(_req: Request, _res: Response): Promise<void> {
  const PARAMS = MATCH_ID_PARAM_SCHEMA.parse(_req.params);
  const BODY = CREATE_OBLIGATIONS_BODY_SCHEMA.parse(_req.body);

  const INPUT: Parameters<typeof createMatchObligationsSV>[0] = {
    matchId: PARAMS.matchId,
    amountBasePerPerson: BODY.amountBasePerPerson,
  };
  if (BODY.participantUserIds !== undefined) {
    INPUT.participantUserIds = BODY.participantUserIds;
  }

  const RESULT = await createMatchObligationsSV(INPUT);

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
  const PARAMS = TRANSACTION_ID_PARAM_SCHEMA.parse(_req.params);

  const RESULT = await confirmTransactionManualSV(PARAMS.transactionId);

  _res.status(200).json({
    success: true,
    message: 'Pago confirmado correctamente.',
    data: RESULT,
  });
}

export async function getMatchTransactionsSummaryCON(_req: Request, _res: Response): Promise<void> {
  const PARAMS = MATCH_ID_PARAM_SCHEMA.parse(_req.params);

  const RESULT = await getMatchTransactionsSummarySV(PARAMS.matchId);

  _res.status(200).json({
    success: true,
    message: 'Resumen obtenido correctamente.',
    data: RESULT,
  });
}

export async function patchUserSubscriptionCON(_req: Request, _res: Response): Promise<void> {
  const PARAMS = USER_ID_PARAM_SCHEMA.parse(_req.params);
  const BODY = UPDATE_SUBSCRIPTION_BODY_SCHEMA.parse(_req.body);

  const RESULT = await updateUserSubscriptionSV(PARAMS.userId, BODY.subscriptionType);

  _res.status(200).json({
    success: true,
    message: 'Suscripcion actualizada correctamente.',
    data: RESULT,
  });
}

export async function getUserTransactionsCON(_req: Request, _res: Response): Promise<void> {
  const PARAMS = USER_ID_PARAM_SCHEMA.parse(_req.params);
  const QUERY = USER_TRANSACTIONS_QUERY_SCHEMA.parse(_req.query);

  const RESULT = await listUserTransactionsSV(PARAMS.userId, QUERY.limit);

  _res.status(200).json({
    success: true,
    message: 'Transacciones obtenidas correctamente.',
    data: RESULT,
  });
}
