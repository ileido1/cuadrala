import type { Request, Response } from 'express';

import { AppError } from '../../domain/errors/app_error.js';
import {
  CREATE_VENUE_PAYMENT_METHOD_UC,
  DELETE_VENUE_PAYMENT_METHOD_UC,
  LIST_ACTIVE_VENUE_PAYMENT_METHODS_UC,
  LIST_ALL_VENUE_PAYMENT_METHODS_UC,
  UPDATE_VENUE_PAYMENT_METHOD_UC,
} from '../composition/venue_payment_methods.composition.js';

export async function getActiveVenuePaymentMethodsCON(
  _req: Request,
  _res: Response,
): Promise<void> {
  const VENUE_ID = _req.params.venueId as string;
  const RESULT = await LIST_ACTIVE_VENUE_PAYMENT_METHODS_UC.executeSV(VENUE_ID);
  _res.status(200).json({
    success: true,
    data: RESULT,
  });
}

export async function getAllVenuePaymentMethodsCON(
  _req: Request,
  _res: Response,
): Promise<void> {
  const ACTOR_USER_ID = _req.authUser?.id;
  if (ACTOR_USER_ID === undefined) {
    throw new AppError('NO_AUTORIZADO', 'Sesion no disponible.', 401);
  }

  const VENUE_ID = _req.params.venueId as string;
  const RESULT = await LIST_ALL_VENUE_PAYMENT_METHODS_UC.executeSV(VENUE_ID, ACTOR_USER_ID);
  _res.status(200).json({
    success: true,
    data: RESULT,
  });
}

export async function postVenuePaymentMethodCON(
  _req: Request,
  _res: Response,
): Promise<void> {
  const ACTOR_USER_ID = _req.authUser?.id;
  if (ACTOR_USER_ID === undefined) {
    throw new AppError('NO_AUTORIZADO', 'Sesion no disponible.', 401);
  }

  const VENUE_ID = _req.params.venueId as string;
  const BODY = _req.body as { type: string; name: string; config?: unknown };
  const CREATED = await CREATE_VENUE_PAYMENT_METHOD_UC.executeSV(
    VENUE_ID,
    ACTOR_USER_ID,
    BODY,
  );

  _res.status(201).json({
    success: true,
    message: 'Método de pago creado correctamente.',
    data: CREATED,
  });
}

export async function putVenuePaymentMethodCON(
  _req: Request,
  _res: Response,
): Promise<void> {
  const ACTOR_USER_ID = _req.authUser?.id;
  if (ACTOR_USER_ID === undefined) {
    throw new AppError('NO_AUTORIZADO', 'Sesion no disponible.', 401);
  }

  const VENUE_ID = _req.params.venueId as string;
  const PAYMENT_METHOD_ID = _req.params.paymentMethodId as string;
  const BODY = _req.body as {
    type?: string;
    name?: string;
    config?: unknown;
    isActive?: boolean;
    position?: number;
  };

  const UPDATED = await UPDATE_VENUE_PAYMENT_METHOD_UC.executeSV(
    VENUE_ID,
    PAYMENT_METHOD_ID,
    ACTOR_USER_ID,
    BODY,
  );

  _res.status(200).json({
    success: true,
    message: 'Método de pago actualizado.',
    data: UPDATED,
  });
}

export async function deleteVenuePaymentMethodCON(
  _req: Request,
  _res: Response,
): Promise<void> {
  const ACTOR_USER_ID = _req.authUser?.id;
  if (ACTOR_USER_ID === undefined) {
    throw new AppError('NO_AUTORIZADO', 'Sesion no disponible.', 401);
  }

  const VENUE_ID = _req.params.venueId as string;
  const PAYMENT_METHOD_ID = _req.params.paymentMethodId as string;
  await DELETE_VENUE_PAYMENT_METHOD_UC.executeSV(
    VENUE_ID,
    PAYMENT_METHOD_ID,
    ACTOR_USER_ID,
  );

  _res.status(200).json({
    success: true,
    message: 'Método de pago eliminado.',
  });
}
