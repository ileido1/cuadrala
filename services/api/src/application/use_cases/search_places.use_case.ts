import type { GeocodingPlaceCandidateDTO, GeocodingProvider } from '../../domain/ports/geocoding_provider.js';

export class SearchPlacesUseCase {
  public constructor(private readonly _geocodingProvider: GeocodingProvider) {}

  async executeSV(_dto: {
    query: string;
    nearLat?: number | undefined;
    nearLng?: number | undefined;
    limit?: number | undefined;
  }): Promise<GeocodingPlaceCandidateDTO[]> {
    return this._geocodingProvider.searchPlacesSV(_dto);
  }
}

