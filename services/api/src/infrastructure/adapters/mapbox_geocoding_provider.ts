import { AppError } from '../../domain/errors/app_error.js';
import type {
  GeocodingPlaceCandidateDTO,
  GeocodingPlaceDetailsDTO,
  GeocodingProvider,
} from '../../domain/ports/geocoding_provider.js';

type MapboxFeature = {
  id: string;
  text: string;
  place_name: string;
  center: [number, number];
  properties?: { address?: string };
  context?: Array<{ id: string; text: string }>;
};

function mapContextFieldSV(_feature: MapboxFeature, _prefix: string): string | null {
  const HIT = _feature.context?.find((_c) => _c.id.startsWith(_prefix));
  return HIT?.text ?? null;
}

function mapAddressLine1SV(_feature: MapboxFeature): string | null {
  const NUM = _feature.properties?.address?.trim();
  if (NUM !== undefined && NUM !== '') {
    return `${NUM} ${_feature.text}`.trim();
  }
  return _feature.text ?? null;
}

function mapDetailsSV(_feature: MapboxFeature): GeocodingPlaceDetailsDTO {
  const [LNG, LAT] = _feature.center;
  return {
    placeId: _feature.id,
    name: _feature.text,
    formattedAddress: _feature.place_name ?? null,
    lat: LAT,
    lng: LNG,
    addressCountry: mapContextFieldSV(_feature, 'country.'),
    addressState: mapContextFieldSV(_feature, 'region.'),
    addressCity: mapContextFieldSV(_feature, 'place.'),
    addressLine1: mapAddressLine1SV(_feature),
    addressPostalCode: mapContextFieldSV(_feature, 'postcode.'),
  };
}

export class MapboxGeocodingProvider implements GeocodingProvider {
  public constructor(private readonly _accessToken: string) {
    if (_accessToken.trim() === '') {
      throw new AppError('VALIDACION_FALLIDA', 'MAPBOX_ACCESS_TOKEN es obligatorio para Mapbox.', 400);
    }
  }

  async searchPlacesSV(_dto: {
    query: string;
    nearLat?: number;
    nearLng?: number;
    limit?: number;
  }): Promise<GeocodingPlaceCandidateDTO[]> {
    const LIMIT = Math.min(10, Math.max(1, _dto.limit ?? 5));
    const URL = new URL(
      `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(_dto.query)}.json`,
    );
    URL.searchParams.set('access_token', this._accessToken);
    URL.searchParams.set('limit', String(LIMIT));
    if (_dto.nearLat !== undefined && _dto.nearLng !== undefined) {
      URL.searchParams.set('proximity', `${_dto.nearLng},${_dto.nearLat}`);
    }

    const RES = await fetch(URL.toString());
    if (!RES.ok) {
      throw new AppError('MAPS_ERROR', 'Error consultando el proveedor de mapas.', 502, {
        provider: 'mapbox',
        status: RES.status,
      });
    }
    const JSON = (await RES.json()) as { features?: MapboxFeature[] };
    const FEATURES = JSON.features ?? [];
    return FEATURES.map((_f) => {
      const [LNG, LAT] = _f.center;
      return {
        placeId: _f.id,
        name: _f.text,
        formattedAddress: _f.place_name ?? null,
        lat: LAT,
        lng: LNG,
      };
    });
  }

  async getPlaceDetailsSV(_placeId: string): Promise<GeocodingPlaceDetailsDTO> {
    const URL = new URL(`https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(_placeId)}.json`);
    URL.searchParams.set('access_token', this._accessToken);
    URL.searchParams.set('limit', '1');

    const RES = await fetch(URL.toString());
    if (!RES.ok) {
      throw new AppError('MAPS_ERROR', 'Error consultando el proveedor de mapas.', 502, {
        provider: 'mapbox',
        status: RES.status,
      });
    }
    const JSON = (await RES.json()) as { features?: MapboxFeature[] };
    const FEATURE = JSON.features?.[0];
    if (FEATURE === undefined) {
      throw new AppError('PLACE_NO_ENCONTRADO', 'No se encontró el lugar indicado.', 404);
    }
    return mapDetailsSV(FEATURE);
  }
}

