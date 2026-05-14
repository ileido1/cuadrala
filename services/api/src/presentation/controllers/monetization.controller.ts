import type { Request, Response } from 'express';

import { AppError } from '../../domain/errors/app_error.js';
import {
  createMatchObligationsSV,
  createReservationObligationsSV,
  getMatchTransactionsSummarySV,
  getReservationPaymentSummarySV,
  listUserTransactionsSV,
  updateUserSubscriptionSV,
  confirmTransactionManualSV,
} from '../../application/monetization.service.js';
import { CONFIRM_TRANSACTION_AS_VENUE_STAFF_UC } from '../composition/venue_staff.composition.js';
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

export async function postCreateReservationObligationsCON(
  _req: Request,
  _res: Response,
): Promise<void> {
  const PARAMS = RESERVATION_ID_PARAM_SCHEMA.parse(_req.params);
  const BODY = CREATE_OBLIGATIONS_BODY_SCHEMA.parse(_req.body);

  const INPUT: Parameters<typeof createReservationObligationsSV>[0] = {
    reservationId: PARAMS.reservationId,
    amountBasePerPerson: BODY.amountBasePerPerson,
  };
  if (BODY.participantUserIds !== undefined) {
    INPUT.participantUserIds = BODY.participantUserIds;
  }

  const RESULT = await createReservationObligationsSV(INPUT);

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

  const RESULT = await getReservationPaymentSummarySV(PARAMS.reservationId);

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
  const _BODY = REJECT_TRANSACTION_BODY_SCHEMA.parse(_req.body ?? {});

  const TX = await import('../../infrastructure/repositories/transaction.repository.js')
    .then((m) => m.findTransactionByIdRepo(PARAMS.transactionId));
  if (!TX) {
    throw new AppError('TRANSACCION_NO_ENCONTRADA', 'La transaccion no existe.', 404);
  }
  if (TX.status !== 'PENDING') {
    throw new AppError(
      'TRANSACCION_NO_PENDIENTE',
      'Solo se pueden rechazar transacciones pendientes.',
      400,
    );
  }

  // Verify venue staff access
  if (TX.reservationId !== null) {
    const { findTransactionWithReservationVenueRepo } = await import(
      '../../infrastructure/repositories/transaction.repository.js'
    );
    const TX_WITH_VENUE = await findTransactionWithReservationVenueRepo(PARAMS.transactionId);
    if (!TX_WITH_VENUE?.reservation?.court?.venue) {
      throw new AppError('NO_AUTORIZADO', 'No se pudo verificar la sede.', 403);
    }
  }

  const { rejectTransactionManualRepo } = await import(
    '../../infrastructure/repositories/transaction.repository.js'
  );
  const REJECTED = await rejectTransactionManualRepo(PARAMS.transactionId);

  _res.status(200).json({
    success: true,
    message: 'Transaccion rechazada.',
    data: { id: REJECTED.id, status: REJECTED.status },
  });
}
