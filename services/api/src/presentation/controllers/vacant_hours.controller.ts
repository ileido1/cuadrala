import type { Request, Response } from 'express';

import { AppError } from '../../domain/errors/app_error.js';
import { ENV_CONST } from '../../config/env.js';
import {
  CANCEL_VACANT_HOUR_UC,
  LIST_VACANT_HOURS_UC,
  PUBLISH_VACANT_HOUR_UC,
} from '../composition/vacant_hours.composition.js';
import {
  LIST_VACANT_HOURS_QUERY_SCHEMA,
  PUBLISH_VACANT_HOUR_BODY_SCHEMA,
  VACANT_HOUR_ID_PARAM_SCHEMA,
} from '../validation/vacant_hours.validation.js';

function requireAdminSecretSV(_req: Request): void {
  const SECRET = _req.header('x-admin-secret');
  if (SECRET === undefined || SECRET !== ENV_CONST.ADMIN_DISPATCH_SECRET) {
    throw new AppError('NO_AUTORIZADO', 'Secret invalido.', 401);
  }
}

export async function postPublishVacantHourCON(_req: Request, _res: Response): Promise<void> {
  requireAdminSecretSV(_req);

  const BODY = PUBLISH_VACANT_HOUR_BODY_SCHEMA.parse(_req.body ?? {});
  const RESULT = await PUBLISH_VACANT_HOUR_UC.executeSV({
    venueId: BODY.venueId,
    courtId: BODY.courtId,
    sportId: BODY.sportId,
    categoryId: BODY.categoryId,
    scheduledAt: new Date(BODY.scheduledAt),
    ...(BODY.durationMinutes !== undefined ? { durationMinutes: BODY.durationMinutes } : {}),
    ...(BODY.pricePerPlayerCents !== undefined ? { pricePerPlayerCents: BODY.pricePerPlayerCents } : {}),
    ...(BODY.maxParticipants !== undefined ? { maxParticipants: BODY.maxParticipants } : {}),
  });

  _res.status(201).json({
    success: true,
    message: 'Vacante publicada correctamente.',
    data: RESULT,
  });
}

export async function getVacantHoursCON(_req: Request, _res: Response): Promise<void> {
  requireAdminSecretSV(_req);

  const QUERY = LIST_VACANT_HOURS_QUERY_SCHEMA.parse(_req.query ?? {});
  const RESULT = await LIST_VACANT_HOURS_UC.executeSV({
    venueId: QUERY.venueId,
    courtId: QUERY.courtId,
    status: QUERY.status,
    page: QUERY.page,
    limit: QUERY.limit,
  });

  _res.status(200).json({
    success: true,
    message: 'Vacantes obtenidas correctamente.',
    data: {
      items: RESULT.items,
      pageInfo: { page: RESULT.page.page, limit: RESULT.page.limit, total: RESULT.total },
    },
  });
}

export async function patchCancelVacantHourCON(_req: Request, _res: Response): Promise<void> {
  requireAdminSecretSV(_req);

  const PARAMS = VACANT_HOUR_ID_PARAM_SCHEMA.parse(_req.params ?? {});
  const RESULT = await CANCEL_VACANT_HOUR_UC.executeSV(PARAMS.id);

  _res.status(200).json({
    success: true,
    message: 'Vacante cancelada correctamente.',
    data: RESULT,
  });
}

