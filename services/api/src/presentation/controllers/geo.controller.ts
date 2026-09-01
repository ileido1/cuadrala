import type { Request, Response } from 'express';

import { buildGeoUseCasesSV } from '../composition/geo.composition.js';
import {
  GEO_PLACE_ID_PARAM_SCHEMA,
  GEO_SEARCH_QUERY_SCHEMA,
} from '../validation/geo.validation.js';

/**
 * @name    :parseNearSV
 * @version :1.0.0
 * @description :Parte el parámetro `near` con formato "lat,lng" en coordenadas.
 * @param {string} _near - Coordenadas en formato "lat,lng"
 * @return {{lat: number, lng: number}}
 */
function parseNearSV(_near: string): { lat: number; lng: number } {
  const [LAT_STR, LNG_STR] = _near.split(',');
  return { lat: Number(LAT_STR), lng: Number(LNG_STR) };
}

/**
 * @name    :getGeoPlacesSearchCON
 * @version :2.0.0
 * @description :Busca lugares en el proveedor de mapas. La autorización la
 * resuelve `requireSecret('x-geo-secret')` en el router.
 * @param {Request} _req - Request de Express
 * @param {Response} _res - Response de Express
 * @return {Promise<void>}
 */
export async function getGeoPlacesSearchCON(_req: Request, _res: Response): Promise<void> {
  const QUERY = GEO_SEARCH_QUERY_SCHEMA.parse(_req.query);
  const NEAR = QUERY.near === undefined ? undefined : parseNearSV(QUERY.near);
  const { searchPlacesUC: SEARCH_PLACES_UC } = buildGeoUseCasesSV();

  const ITEMS = await SEARCH_PLACES_UC.executeSV({
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

/**
 * @name    :getGeoPlaceDetailsCON
 * @version :2.0.0
 * @description :Devuelve el detalle de un lugar. La autorización la resuelve
 * `requireSecret('x-geo-secret')` en el router.
 * @param {Request} _req - Request de Express
 * @param {Response} _res - Response de Express
 * @return {Promise<void>}
 */
export async function getGeoPlaceDetailsCON(_req: Request, _res: Response): Promise<void> {
  const PARAMS = GEO_PLACE_ID_PARAM_SCHEMA.parse(_req.params);
  const { getPlaceDetailsUC: GET_PLACE_DETAILS_UC } = buildGeoUseCasesSV();
  const DETAILS = await GET_PLACE_DETAILS_UC.executeSV(PARAMS.placeId);

  _res.status(200).json({
    success: true,
    message: 'Detalle obtenido correctamente.',
    data: DETAILS,
  });
}
