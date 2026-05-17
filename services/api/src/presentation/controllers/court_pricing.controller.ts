import type { Request, Response } from 'express';

import { AppError } from '../../domain/errors/app_error.js';
import {
  CREATE_COURT_PRICING_TIER_UC,
  DELETE_COURT_PRICING_TIER_UC,
  LIST_COURT_PRICING_TIERS_UC,
  UPDATE_COURT_PRICING_TIER_UC,
} from '../composition/court_pricing.composition.js';
import {
  CREATE_PRICING_TIER_BODY_SCHEMA,
  LIST_PRICING_TIERS_QUERY_SCHEMA,
  PRICING_TIER_ID_PARAM_SCHEMA,
  UPDATE_PRICING_TIER_BODY_SCHEMA,
} from '../validation/court_pricing.validation.js';
import { COURT_ID_PARAM_SCHEMA, VENUE_ID_PARAM_SCHEMA } from '../validation/venues.validation.js';

export async function getCourtPricingTiersCON(_req: Request, _res: Response): Promise<void> {
  const ACTOR_USER_ID = _req.authUser?.id;
  if (ACTOR_USER_ID === undefined) {
    throw new AppError('NO_AUTENTICADO', 'Se requiere autenticación.', 401);
  }

  const PARAMS = {
    ...VENUE_ID_PARAM_SCHEMA.parse(_req.params),
    ...COURT_ID_PARAM_SCHEMA.parse(_req.params),
  };
  LIST_PRICING_TIERS_QUERY_SCHEMA.parse(_req.query);

  const RESULT = await LIST_COURT_PRICING_TIERS_UC.executeSV({
    venueId: PARAMS.venueId,
    courtId: PARAMS.courtId,
    actorUserId: ACTOR_USER_ID,
  });

  _res.status(200).json({
    success: true,
    message: 'Tarifas obtenidas correctamente.',
    data: RESULT,
  });
}

export async function postCourtPricingTierCON(_req: Request, _res: Response): Promise<void> {
  const ACTOR_USER_ID = _req.authUser?.id;
  if (ACTOR_USER_ID === undefined) {
    throw new AppError('NO_AUTENTICADO', 'Se requiere autenticación.', 401);
  }

  const PARAMS = {
    ...VENUE_ID_PARAM_SCHEMA.parse(_req.params),
    ...COURT_ID_PARAM_SCHEMA.parse(_req.params),
  };
  const BODY = CREATE_PRICING_TIER_BODY_SCHEMA.parse(_req.body);

  const CREATED = await CREATE_COURT_PRICING_TIER_UC.executeSV(
    {
      venueId: PARAMS.venueId,
      courtId: PARAMS.courtId,
      actorUserId: ACTOR_USER_ID,
    },
    BODY,
  );

  _res.status(201).json({
    success: true,
    message: 'Tarifa creada correctamente.',
    data: CREATED,
  });
}

export async function putCourtPricingTierCON(_req: Request, _res: Response): Promise<void> {
  const ACTOR_USER_ID = _req.authUser?.id;
  if (ACTOR_USER_ID === undefined) {
    throw new AppError('NO_AUTENTICADO', 'Se requiere autenticación.', 401);
  }

  const PARAMS = {
    ...VENUE_ID_PARAM_SCHEMA.parse(_req.params),
    ...COURT_ID_PARAM_SCHEMA.parse(_req.params),
    ...PRICING_TIER_ID_PARAM_SCHEMA.parse(_req.params),
  };
  const BODY = UPDATE_PRICING_TIER_BODY_SCHEMA.parse(_req.body);

  const UPDATED = await UPDATE_COURT_PRICING_TIER_UC.executeSV(
    {
      venueId: PARAMS.venueId,
      courtId: PARAMS.courtId,
      tierId: PARAMS.tierId,
      actorUserId: ACTOR_USER_ID,
    },
    BODY,
  );

  _res.status(200).json({
    success: true,
    message: 'Tarifa actualizada correctamente.',
    data: UPDATED,
  });
}

export async function deleteCourtPricingTierCON(_req: Request, _res: Response): Promise<void> {
  const ACTOR_USER_ID = _req.authUser?.id;
  if (ACTOR_USER_ID === undefined) {
    throw new AppError('NO_AUTENTICADO', 'Se requiere autenticación.', 401);
  }

  const PARAMS = {
    ...VENUE_ID_PARAM_SCHEMA.parse(_req.params),
    ...COURT_ID_PARAM_SCHEMA.parse(_req.params),
    ...PRICING_TIER_ID_PARAM_SCHEMA.parse(_req.params),
  };

  await DELETE_COURT_PRICING_TIER_UC.executeSV({
    venueId: PARAMS.venueId,
    courtId: PARAMS.courtId,
    tierId: PARAMS.tierId,
    actorUserId: ACTOR_USER_ID,
  });

  _res.status(200).json({
    success: true,
    message: 'Tarifa eliminada correctamente.',
    data: null,
  });
}
