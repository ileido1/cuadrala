import type { Request, Response } from 'express';

import { buildGeoUseCasesSV } from '../composition/geo.composition.js';
import { VENUE_GEOCODE_BODY_SCHEMA, VENUE_ID_PARAM_SCHEMA } from '../validation/geo.validation.js';

/**
 * @name    :postVenueGeocodeCON
 * @version :2.0.0
 * @description :Geocodifica una sede a partir de un placeId. La autorización la
 * resuelve `requireSecret('x-geo-secret')` en el router.
 * @param {Request} _req - Request de Express
 * @param {Response} _res - Response de Express
 * @return {Promise<void>}
 */
export async function postVenueGeocodeCON(_req: Request, _res: Response): Promise<void> {
  const PARAMS = VENUE_ID_PARAM_SCHEMA.parse(_req.params);
  const BODY = VENUE_GEOCODE_BODY_SCHEMA.parse(_req.body);

  const { geocodeVenueUC: GEOCODE_VENUE_UC } = buildGeoUseCasesSV();
  const UPDATED = await GEOCODE_VENUE_UC.executeSV({
    venueId: PARAMS.venueId,
    placeId: BODY.placeId,
  });

  _res.status(200).json({
    success: true,
    message: 'Sede geocodificada correctamente.',
    data: UPDATED,
  });
}
