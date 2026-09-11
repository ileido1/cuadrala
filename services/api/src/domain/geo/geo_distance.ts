//? Funciones puras de geolocalización para el listado de torneos con `near`.
//? La matemática espeja la de `PrismaVenueRepository.listVenuesNearSV`
//? (bbox + haversine), aunque cada adaptador mantiene su propia copia.

/**
 * @name    :kmToLatitudeDeltaSV
 * @version :1.0.0
 * @description :Convierte un radio en km al delta de latitud equivalente
 * (grados), para construir el bounding box de una consulta "near".
 * @param {number} _radiusKm - Radio en kilómetros.
 * @returns {number} Delta de latitud en grados.
 */
export function kmToLatitudeDeltaSV(_radiusKm: number): number {
  return _radiusKm / 110.574;
}

/**
 * @name    :kmToLongitudeDeltaSV
 * @version :1.0.0
 * @description :Convierte un radio en km al delta de longitud equivalente
 * (grados) para una latitud dada — la distancia entre meridianos se achica
 * cerca de los polos, por eso depende de `_lat`.
 * @param {number} _radiusKm - Radio en kilómetros.
 * @param {number} _lat - Latitud de referencia, en grados.
 * @returns {number} Delta de longitud en grados.
 */
export function kmToLongitudeDeltaSV(_radiusKm: number, _lat: number): number {
  const LAT_RAD = (_lat * Math.PI) / 180;
  const KM_PER_DEG = 111.320 * Math.cos(LAT_RAD);
  return _radiusKm / Math.max(1e-6, KM_PER_DEG);
}

/**
 * @name    :haversineDistanceKmSV
 * @version :1.0.0
 * @description :Distancia entre dos coordenadas sobre la esfera terrestre,
 * en kilómetros, usando la fórmula de haversine.
 * @param {number} _lat1 - Latitud del primer punto, en grados.
 * @param {number} _lng1 - Longitud del primer punto, en grados.
 * @param {number} _lat2 - Latitud del segundo punto, en grados.
 * @param {number} _lng2 - Longitud del segundo punto, en grados.
 * @returns {number} Distancia en kilómetros.
 */
export function haversineDistanceKmSV(
  _lat1: number,
  _lng1: number,
  _lat2: number,
  _lng2: number,
): number {
  const EARTH_RADIUS_KM = 6371;
  const D_LAT = ((_lat2 - _lat1) * Math.PI) / 180;
  const D_LNG = ((_lng2 - _lng1) * Math.PI) / 180;
  const A =
    Math.sin(D_LAT / 2) * Math.sin(D_LAT / 2)
    + Math.cos((_lat1 * Math.PI) / 180)
      * Math.cos((_lat2 * Math.PI) / 180)
      * Math.sin(D_LNG / 2)
      * Math.sin(D_LNG / 2);
  const C = 2 * Math.atan2(Math.sqrt(A), Math.sqrt(1 - A));
  return EARTH_RADIUS_KM * C;
}
