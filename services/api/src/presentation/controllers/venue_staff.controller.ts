import type { Request, Response } from 'express';

import { AppError } from '../../domain/errors/app_error.js';
import {
  CONFIRM_TRANSACTION_AS_VENUE_STAFF_UC,
  LIST_VENUE_PENDING_TRANSACTIONS_UC,
  LIST_VENUE_STAFF_UC,
  UPSERT_VENUE_STAFF_UC,
} from '../composition/venue_staff.composition.js';
import {
  LIST_VENUE_TRANSACTIONS_PARAMS_SCHEMA,
  LIST_VENUE_TRANSACTIONS_QUERY_SCHEMA,
  UPSERT_VENUE_STAFF_BODY_SCHEMA,
  VENUE_ID_PARAMS_SCHEMA,
} from '../validation/venue_staff.validation.js';
import {
  CONFIRM_TRANSACTION_BODY_SCHEMA,
  TRANSACTION_ID_PARAM_SCHEMA,
} from '../validation/monetization.validation.js';
import { parseCurrencyCode } from '../../domain/money/currency_code.js';

export async function postUpsertVenueStaffCON(_req: Request, _res: Response): Promise<void> {
  const ACTOR_USER_ID = _req.authUser?.id;
  if (ACTOR_USER_ID === undefined) {
    throw new AppError('NO_AUTORIZADO', 'Sesion no disponible.', 401);
  }

  const PARAMS = VENUE_ID_PARAMS_SCHEMA.parse(_req.params);
  const BODY = UPSERT_VENUE_STAFF_BODY_SCHEMA.parse(_req.body);

  const RESULT = await UPSERT_VENUE_STAFF_UC.executeSV({
    venueId: PARAMS.venueId,
    userId: BODY.userId,
    ...(BODY.role !== undefined && { role: BODY.role }),
  });

  _res.status(RESULT.created ? 201 : 200).json({
    success: true,
    message: RESULT.created ? 'Staff registrado correctamente.' : 'Staff actualizado correctamente.',
    data: RESULT.staff,
  });
}

export async function getVenueStaffCON(_req: Request, _res: Response): Promise<void> {
  const PARAMS = VENUE_ID_PARAMS_SCHEMA.parse(_req.params);

  const RESULT = await LIST_VENUE_STAFF_UC.executeSV({
    venueId: PARAMS.venueId,
  });

  _res.status(200).json({
    success: true,
    message: 'Staff obtenido correctamente.',
    data: RESULT,
  });
}

export async function getVenuePendingTransactionsCON(_req: Request, _res: Response): Promise<void> {
  const ACTOR_USER_ID = _req.authUser?.id;
  if (ACTOR_USER_ID === undefined) {
    throw new AppError('NO_AUTORIZADO', 'Sesion no disponible.', 401);
  }

  const PARAMS = LIST_VENUE_TRANSACTIONS_PARAMS_SCHEMA.parse(_req.params);
  const QUERY = LIST_VENUE_TRANSACTIONS_QUERY_SCHEMA.parse(_req.query);

  const RESULT = await LIST_VENUE_PENDING_TRANSACTIONS_UC.executeSV({
    venueId: PARAMS.venueId,
    userId: ACTOR_USER_ID,
    ...(QUERY.from !== undefined ? { from: QUERY.from } : {}),
    ...(QUERY.to !== undefined ? { to: QUERY.to } : {}),
    ...(QUERY.matchId !== undefined ? { matchId: QUERY.matchId } : {}),
  });

  _res.status(200).json({
    success: true,
    message: 'Transacciones pendientes obtenidas correctamente.',
    data: RESULT,
  });
}

export async function patchConfirmVenueTransactionCON(_req: Request, _res: Response): Promise<void> {
  const ACTOR_USER_ID = _req.authUser?.id;
  if (ACTOR_USER_ID === undefined) {
    throw new AppError('NO_AUTORIZADO', 'Sesion no disponible.', 401);
  }

  const PARAMS = {
    venueId: _req.params.venueId,
    transactionId: _req.params.transactionId,
  };
  const VALIDATED = {
    venueId: VENUE_ID_PARAMS_SCHEMA.shape.venueId.parse(PARAMS.venueId),
    transactionId: TRANSACTION_ID_PARAM_SCHEMA.shape.transactionId.parse(PARAMS.transactionId),
  };

  const BODY = CONFIRM_TRANSACTION_BODY_SCHEMA.parse(_req.body ?? {});

  const RESULT = await CONFIRM_TRANSACTION_AS_VENUE_STAFF_UC.executeSV({
    transactionId: VALIDATED.transactionId,
    userId: ACTOR_USER_ID,
    venuePaymentMethodId: BODY.venuePaymentMethodId,
    ...(BODY.settlementAmount !== undefined
      ? {
          settlementAmount: {
            amountMinor: BigInt(BODY.settlementAmount.amountMinor),
            currencyCode: parseCurrencyCode(BODY.settlementAmount.currencyCode),
          },
        }
      : {}),
    referenceNumber: BODY.referenceNumber,
    paymentData: BODY.paymentData,
  });

  _res.status(200).json({
    success: true,
    message: 'Transacción confirmada correctamente.',
    data: RESULT,
  });
}
