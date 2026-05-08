import type { Request, Response } from 'express';

import { AppError } from '../../domain/errors/app_error.js';
import {
  LIST_VENUE_PENDING_TRANSACTIONS_UC,
  LIST_VENUE_STAFF_UC,
  UPSERT_VENUE_STAFF_UC,
} from '../composition/venue_staff.composition.js';
import {
  LIST_VENUE_TRANSACTIONS_PARAMS_SCHEMA,
  UPSERT_VENUE_STAFF_BODY_SCHEMA,
  VENUE_ID_PARAMS_SCHEMA,
} from '../validation/venue_staff.validation.js';

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

  const RESULT = await LIST_VENUE_PENDING_TRANSACTIONS_UC.executeSV({
    venueId: PARAMS.venueId,
    userId: ACTOR_USER_ID,
  });

  _res.status(200).json({
    success: true,
    message: 'Transacciones pendientes obtenidas correctamente.',
    data: RESULT,
  });
}
