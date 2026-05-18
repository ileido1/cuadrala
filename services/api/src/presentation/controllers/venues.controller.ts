import type { Request, Response } from 'express';

import { AppError } from '../../domain/errors/app_error.js';
import {
  CANCEL_COURT_UC,
  CREATE_COURT_UC,
  CREATE_VENUE_UC,
  GET_VENUE_DETAIL_UC,
  GET_VENUE_PAYMENT_INFO_UC,
  LIST_COURTS_UC,
  LIST_MY_VENUES_UC,
  LIST_VENUES_UC,
  UPDATE_COURT_UC,
} from '../composition/venues.composition.js';
import {
  COURT_ID_PARAM_SCHEMA,
  CREATE_COURT_BODY_SCHEMA,
  CREATE_VENUE_BODY_SCHEMA,
  LIST_COURTS_QUERY_SCHEMA,
  LIST_VENUES_QUERY_SCHEMA,
  UPDATE_COURT_BODY_SCHEMA,
  VENUE_ID_PARAM_SCHEMA,
} from '../validation/venues.validation.js';
import type {
  CancelCourtInputDTO,
  CreateCourtInputDTO,
  ListCourtsInputDTO,
  UpdateCourtInputDTO,
} from '../../application/use_cases/court.use_cases.js';

export async function getVenuesCON(_req: Request, _res: Response): Promise<void> {
  const QUERY = LIST_VENUES_QUERY_SCHEMA.parse(_req.query);
  const RESULT = await LIST_VENUES_UC.executeSV({
    page: QUERY.page,
    limit: QUERY.limit,
    ...(QUERY.near !== undefined ? { near: QUERY.near } : {}),
    radiusKm: QUERY.radiusKm,
  });

  _res.status(200).json({
    success: true,
    message: 'Sedes obtenidas correctamente.',
    data: { items: RESULT.items, pageInfo: { page: QUERY.page, limit: QUERY.limit, total: RESULT.total } },
  });
}

export async function getMyVenuesCON(_req: Request, _res: Response): Promise<void> {
  const USER_ID = _req.authUser?.id;
  if (USER_ID === undefined) {
    throw new AppError('NO_AUTENTICADO', 'Se requiere autenticación.', 401);
  }

  const RESULT = await LIST_MY_VENUES_UC.executeSV(USER_ID);

  _res.status(200).json({
    success: true,
    message: 'Sedes obtenidas correctamente.',
    data: RESULT,
  });
}

export async function postVenueCON(_req: Request, _res: Response): Promise<void> {
  const BODY = CREATE_VENUE_BODY_SCHEMA.parse(_req.body);
  const CREATED = await CREATE_VENUE_UC.executeSV({
    name: BODY.name,
    address: BODY.address,
    latitude: BODY.latitude,
    longitude: BODY.longitude,
    paymentHolder: BODY.paymentHolder,
    paymentBank: BODY.paymentBank,
    paymentCvu: BODY.paymentCvu,
    paymentAlias: BODY.paymentAlias,
    paymentNotes: BODY.paymentNotes,
    ownerUserId: BODY.ownerUserId,
  });

  _res.status(201).json({
    success: true,
    message: 'Sede creada correctamente.',
    data: CREATED,
  });
}

export async function postCourtCON(_req: Request, _res: Response): Promise<void> {
  const PARAMS = VENUE_ID_PARAM_SCHEMA.parse(_req.params);
  const BODY = CREATE_COURT_BODY_SCHEMA.parse(_req.body);

  const INPUT: CreateCourtInputDTO = {
    venueId: PARAMS.venueId,
    name: BODY.name,
    ...(BODY.sportType !== undefined ? { sportType: BODY.sportType } : {}),
    ...(BODY.indoor !== undefined ? { indoor: BODY.indoor } : {}),
    ...(BODY.lighting !== undefined ? { lighting: BODY.lighting } : {}),
    ...(BODY.surfaceType !== undefined ? { surfaceType: BODY.surfaceType } : {}),
    ...(BODY.durationMinutes !== undefined ? { durationMinutes: BODY.durationMinutes } : {}),
    ...(BODY.pricePerHourCents !== undefined ? { pricePerHourCents: BODY.pricePerHourCents } : {}),
    ...(BODY.capacity !== undefined ? { capacity: BODY.capacity } : {}),
  };

  const RESULT = await CREATE_COURT_UC.executeSV(INPUT);

  _res.status(201).json({
    success: true,
    message: 'Cancha creada correctamente.',
    data: RESULT.court,
  });
}

export async function getVenueCourtsCON(_req: Request, _res: Response): Promise<void> {
  const PARAMS = VENUE_ID_PARAM_SCHEMA.parse(_req.params);
  const QUERY = LIST_COURTS_QUERY_SCHEMA.parse(_req.query);

  const RESULT = await LIST_COURTS_UC.executeSV({
    venueId: PARAMS.venueId,
    ...(QUERY.status !== undefined ? { status: QUERY.status } : {}),
  } as ListCourtsInputDTO);

  _res.status(200).json({
    success: true,
    message: 'Canchas obtenidas correctamente.',
    data: { items: RESULT.courts },
  });
}

export async function getVenuePaymentInfoCON(_req: Request, _res: Response): Promise<void> {
  const ACTOR_USER_ID = _req.authUser?.id;
  if (ACTOR_USER_ID === undefined) {
    throw new AppError('NO_AUTORIZADO', 'Sesion no disponible.', 401);
  }

  const PARAMS = VENUE_ID_PARAM_SCHEMA.parse(_req.params);
  const VENUE = await GET_VENUE_PAYMENT_INFO_UC.executeSV(PARAMS.venueId);

  _res.status(200).json({
    success: true,
    message: 'Informacion de pago obtenida correctamente.',
    data: VENUE,
  });
}

export async function putCourtCON(_req: Request, _res: Response): Promise<void> {
  const PARAMS = {
    ...VENUE_ID_PARAM_SCHEMA.parse(_req.params),
    ...COURT_ID_PARAM_SCHEMA.parse(_req.params),
  };
  const BODY = UPDATE_COURT_BODY_SCHEMA.parse(_req.body);

  const RESULT = await UPDATE_COURT_UC.executeSV({
    courtId: PARAMS.courtId,
    ...BODY,
  } as UpdateCourtInputDTO);

  _res.status(200).json({
    success: true,
    message: 'Cancha actualizada correctamente.',
    data: RESULT.court,
  });
}

export async function deleteCourtCON(_req: Request, _res: Response): Promise<void> {
  const PARAMS = {
    venueId: VENUE_ID_PARAM_SCHEMA.parse(_req.params).venueId,
    courtId: COURT_ID_PARAM_SCHEMA.parse(_req.params).courtId,
  };

  const RESULT = await CANCEL_COURT_UC.executeSV({
    courtId: PARAMS.courtId,
  } as CancelCourtInputDTO);

  _res.status(200).json({
    success: true,
    message: 'Cancha cancelada correctamente.',
    data: RESULT.court,
  });
}

export async function getVenueCON(_req: Request, _res: Response): Promise<void> {
  const ACTOR_USER_ID = _req.authUser?.id;
  if (ACTOR_USER_ID === undefined) {
    throw new AppError('NO_AUTORIZADO', 'Sesion no disponible.', 401);
  }

  const PARAMS = VENUE_ID_PARAM_SCHEMA.parse(_req.params);
  const VENUE = await GET_VENUE_DETAIL_UC.executeSV(PARAMS.venueId);

  _res.status(200).json({
    success: true,
    message: 'Sede obtenida correctamente.',
    data: VENUE,
  });
}
