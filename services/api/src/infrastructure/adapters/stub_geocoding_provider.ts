import type {
  GeocodingPlaceCandidateDTO,
  GeocodingPlaceDetailsDTO,
  GeocodingProvider,
} from '../../domain/ports/geocoding_provider.js';

const STUB_PLACE: GeocodingPlaceDetailsDTO = {
  placeId: 'stub-place-1',
  name: 'Club Cuadrala (Stub)',
  formattedAddress: 'Calle Falsa 123, Ciudad, Estado, 00000, País',
  lat: 10.1234,
  lng: -70.5678,
  addressCountry: 'País',
  addressState: 'Estado',
  addressCity: 'Ciudad',
  addressLine1: 'Calle Falsa 123',
  addressPostalCode: '00000',
};

export class StubGeocodingProvider implements GeocodingProvider {
  async searchPlacesSV(_dto: { query: string; nearLat?: number; nearLng?: number; limit?: number }): Promise<
    GeocodingPlaceCandidateDTO[]
  > {
    const LIMIT = Math.min(10, Math.max(1, _dto.limit ?? 5));
    const HIT: GeocodingPlaceCandidateDTO = {
      placeId: STUB_PLACE.placeId,
      name: STUB_PLACE.name,
      formattedAddress: STUB_PLACE.formattedAddress,
      lat: STUB_PLACE.lat,
      lng: STUB_PLACE.lng,
    };
    return _dto.query.trim() === '' ? [] : Array.from({ length: 1 }).slice(0, LIMIT).map(() => HIT);
  }

  async getPlaceDetailsSV(_placeId: string): Promise<GeocodingPlaceDetailsDTO> {
    return { ...STUB_PLACE, placeId: _placeId };
  }
}

