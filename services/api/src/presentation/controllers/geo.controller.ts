import type { Request, Response } from 'express';

import { AppError } from '../../domain/errors/app_error.js';
import { ENV_CONST } from '../../config/env.js';
import { buildGeoUseCasesSV } from '../composition/geo.composition.js';
import { GEO_PLACE_ID_PARAM_SCHEMA, GEO_SEARCH_QUERY_SCHEMA } from '../validation/geo.validation.js';

function parseNearSV(_near: string): { lat: number; lng: number } {
  const [LAT_STR, LNG_STR] = _near.split(',');
  return { lat: Number(LAT_STR), lng: Number(LNG_STR) };
}

function assertGeoSecretSV(_req: Request): void {
  const SECRET = _req.header('x-geo-secret');
  if (SECRET === undefined || SECRET !== ENV_CONST.GEO_DISPATCH_SECRET) {
    throw new AppError('NO_AUTORIZADO', 'Secret invalido.', 401);
  }
}

export async function getGeoPlacesSearchCON(_req: Request, _res: Response): Promise<void> {
  assertGeoSecretSV(_req);
  const QUERY = GEO_SEARCH_QUERY_SCHEMA.parse(_req.query);
  const NEAR = QUERY.near === undefined ? undefined : parseNearSV(QUERY.near);
  const { searchPlacesUC } = buildGeoUseCasesSV();

  const ITEMS = await searchPlacesUC.executeSV({
    query: QUERY.q,
    nearLat: NEAR?.lat,
    nearLng: NEAR?.lng,
    limit: QUERY.limit,
  });

  _res.status(200).json({
    success: true,
    message: 'Resultados obtenidos correctamente.',
    data: { items: ITEMS },
  });
}

export async function getGeoPlaceDetailsCON(_req: Request, _res: Response): Promise<void> {
  assertGeoSecretSV(_req);
  const PARAMS = GEO_PLACE_ID_PARAM_SCHEMA.parse(_req.params);
  const { getPlaceDetailsUC } = buildGeoUseCasesSV();
  const DETAILS = await getPlaceDetailsUC.executeSV(PARAMS.placeId);

  _res.status(200).json({
    success: true,
    message: 'Detalle obtenido correctamente.',
    data: DETAILS,
  });
}

