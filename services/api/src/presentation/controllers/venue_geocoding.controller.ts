import type { Request, Response } from 'express';

import { AppError } from '../../domain/errors/app_error.js';
import { ENV_CONST } from '../../config/env.js';
import { buildGeoUseCasesSV } from '../composition/geo.composition.js';
import { VENUE_GEOCODE_BODY_SCHEMA, VENUE_ID_PARAM_SCHEMA } from '../validation/geo.validation.js';

function assertGeoSecretSV(_req: Request): void {
  const SECRET = _req.header('x-geo-secret');
  if (SECRET === undefined || SECRET !== ENV_CONST.GEO_DISPATCH_SECRET) {
    throw new AppError('NO_AUTORIZADO', 'Secret invalido.', 401);
  }
}

export async function postVenueGeocodeCON(_req: Request, _res: Response): Promise<void> {
  assertGeoSecretSV(_req);
  const PARAMS = VENUE_ID_PARAM_SCHEMA.parse(_req.params);
  const BODY = VENUE_GEOCODE_BODY_SCHEMA.parse(_req.body);

  const { geocodeVenueUC } = buildGeoUseCasesSV();
  const UPDATED = await geocodeVenueUC.executeSV({ venueId: PARAMS.venueId, placeId: BODY.placeId });

  _res.status(200).json({
    success: true,
    message: 'Sede geocodificada correctamente.',
    data: UPDATED,
  });
}

