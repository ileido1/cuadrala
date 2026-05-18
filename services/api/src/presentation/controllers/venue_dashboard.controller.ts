/**
 * Controlador para stats y configuración de Venue (Backoffice Dashboard API).
 */

import type { Request, Response } from 'express';

import { AppError } from '../../domain/errors/app_error.js';
import {
  ASSERT_VENUE_STAFF_UC,
  GET_DASHBOARD_STATS_UC,
  GET_TRANSACTION_STATS_UC,
  LIST_VENUE_MATCHES_UC,
  LIST_VENUE_TRANSACTION_HISTORY_UC,
  UPDATE_VENUE_UC,
} from '../composition/venue_dashboard.composition.js';
import {
  DASHBOARD_STATS_QUERY_SCHEMA,
  TRANSACTIONS_STATS_QUERY_SCHEMA,
  TRANSACTIONS_HISTORY_QUERY_SCHEMA,
  UPDATE_VENUE_BODY_SCHEMA,
  VENUE_MATCHES_QUERY_SCHEMA,
  VENUE_ID_PARAM_SCHEMA,
} from '../validation/venues.validation.js';

export async function getDashboardStatsCON(_req: Request, _res: Response): Promise<void> {
  const ACTOR_USER_ID = _req.authUser?.id;
  if (ACTOR_USER_ID === undefined) {
    throw new AppError('NO_AUTORIZADO', 'Sesión no disponible.', 401);
  }

  const PARAMS = VENUE_ID_PARAM_SCHEMA.parse(_req.params);
  DASHBOARD_STATS_QUERY_SCHEMA.parse(_req.query);

  await ASSERT_VENUE_STAFF_UC.executeSV({
    actorUserId: ACTOR_USER_ID,
    venueId: PARAMS.venueId,
    forbiddenMessage: 'No tienes permisos para ver stats de esta sede.',
  });

  const STATS = await GET_DASHBOARD_STATS_UC.executeSV(PARAMS.venueId);

  _res.status(200).json({
    success: true,
    message: 'Stats obtenidos correctamente.',
    data: STATS,
  });
}

export async function getTransactionStatsCON(_req: Request, _res: Response): Promise<void> {
  const ACTOR_USER_ID = _req.authUser?.id;
  if (ACTOR_USER_ID === undefined) {
    throw new AppError('NO_AUTORIZADO', 'Sesión no disponible.', 401);
  }

  const PARAMS = VENUE_ID_PARAM_SCHEMA.parse(_req.params);
  TRANSACTIONS_STATS_QUERY_SCHEMA.parse(_req.query);

  await ASSERT_VENUE_STAFF_UC.executeSV({
    actorUserId: ACTOR_USER_ID,
    venueId: PARAMS.venueId,
    forbiddenMessage: 'No tienes permisos para ver transacciones de esta sede.',
  });

  const STATS = await GET_TRANSACTION_STATS_UC.executeSV(PARAMS.venueId);

  _res.status(200).json({
    success: true,
    message: 'Stats de transacciones obtenidos correctamente.',
    data: STATS,
  });
}

export async function getTransactionHistoryCON(_req: Request, _res: Response): Promise<void> {
  const ACTOR_USER_ID = _req.authUser?.id;
  if (ACTOR_USER_ID === undefined) {
    throw new AppError('NO_AUTORIZADO', 'Sesión no disponible.', 401);
  }

  const PARAMS = VENUE_ID_PARAM_SCHEMA.parse(_req.params);
  const QUERY = TRANSACTIONS_HISTORY_QUERY_SCHEMA.parse(_req.query);

  await ASSERT_VENUE_STAFF_UC.executeSV({
    actorUserId: ACTOR_USER_ID,
    venueId: PARAMS.venueId,
    forbiddenMessage: 'No tienes permisos para ver transacciones de esta sede.',
  });

  const RESULT = await LIST_VENUE_TRANSACTION_HISTORY_UC.executeSV(
    PARAMS.venueId,
    QUERY.page,
    QUERY.limit,
  );

  _res.status(200).json({
    success: true,
    message: 'Historial de transacciones obtenido correctamente.',
    data: RESULT,
  });
}

export async function patchVenueCON(_req: Request, _res: Response): Promise<void> {
  const ACTOR_USER_ID = _req.authUser?.id;
  if (ACTOR_USER_ID === undefined) {
    throw new AppError('NO_AUTORIZADO', 'Sesión no disponible.', 401);
  }

  const PARAMS = VENUE_ID_PARAM_SCHEMA.parse(_req.params);
  const BODY = UPDATE_VENUE_BODY_SCHEMA.parse(_req.body);

  await ASSERT_VENUE_STAFF_UC.executeSV({
    actorUserId: ACTOR_USER_ID,
    venueId: PARAMS.venueId,
    forbiddenMessage: 'No tienes permisos para editar esta sede.',
  });

  const RESULT = await UPDATE_VENUE_UC.executeSV(PARAMS.venueId, {
    name: BODY.name,
    address: BODY.address,
    latitude: BODY.latitude,
    longitude: BODY.longitude,
    phone: BODY.phone,
    email: BODY.email,
    description: BODY.description,
    openingHours: BODY.openingHours,
    pricingCurrency: BODY.pricingCurrency,
    displayCurrency: BODY.displayCurrency,
  });

  _res.status(200).json({
    success: true,
    message: 'Sede actualizada correctamente.',
    data: RESULT,
  });
}

export async function getVenueMatchesCON(_req: Request, _res: Response): Promise<void> {
  const ACTOR_USER_ID = _req.authUser?.id;
  if (ACTOR_USER_ID === undefined) {
    throw new AppError('NO_AUTORIZADO', 'Sesión no disponible.', 401);
  }

  const PARAMS = VENUE_ID_PARAM_SCHEMA.parse(_req.params);
  const QUERY = VENUE_MATCHES_QUERY_SCHEMA.parse(_req.query);

  await ASSERT_VENUE_STAFF_UC.executeSV({
    actorUserId: ACTOR_USER_ID,
    venueId: PARAMS.venueId,
    forbiddenMessage: 'No tienes permisos para ver partidos de esta sede.',
  });

  const FILTERS: {
    courtId?: string;
    from?: string;
    to?: string;
    date?: string;
    status?: 'SCHEDULED' | 'IN_PROGRESS' | 'FINISHED' | 'CANCELLED';
  } = {};

  if (QUERY.from !== undefined) FILTERS.from = QUERY.from;
  if (QUERY.to !== undefined) FILTERS.to = QUERY.to;
  if (QUERY.courtId !== undefined) FILTERS.courtId = QUERY.courtId;
  if (QUERY.status !== undefined) FILTERS.status = QUERY.status;

  const RESULT = await LIST_VENUE_MATCHES_UC.executeSV({
    venueId: PARAMS.venueId,
    ...FILTERS,
    page: QUERY.page,
    limit: QUERY.limit,
  });

  _res.status(200).json({
    success: true,
    message: 'Partidos obtenidos correctamente.',
    data: {
      items: RESULT.items.map((_item) => ({
        id: _item.id,
        courtId: _item.courtId,
        courtName: _item.courtName,
        status: _item.status,
        scheduledAt: _item.scheduledAt,
        type: _item.type,
        participantCount: _item.participantCount,
        maxParticipants: _item.maxParticipants,
        pricePerPlayerCents: _item.pricePerPlayerCents,
        categoryName: (_item as unknown as { categoryName?: string }).categoryName,
      })),
      pageInfo: RESULT.pageInfo,
    },
  });
}
