import { GetPlaceDetailsUseCase } from '../../application/use_cases/get_place_details.use_case.js';
import { GeocodeVenueUseCase } from '../../application/use_cases/geocode_venue.use_case.js';
import { SearchPlacesUseCase } from '../../application/use_cases/search_places.use_case.js';
import { MapboxGeocodingProvider } from '../../infrastructure/adapters/mapbox_geocoding_provider.js';
import { NoopGeocodingProvider } from '../../infrastructure/adapters/noop_geocoding_provider.js';
import { PrismaVenueGeocodingRepository } from '../../infrastructure/adapters/prisma_venue_geocoding_repository.js';
import { StubGeocodingProvider } from '../../infrastructure/adapters/stub_geocoding_provider.js';

function buildGeocodingProviderSV() {
  const PROVIDER = (process.env.MAPS_PROVIDER ?? 'noop').toLowerCase();
  if (PROVIDER === 'stub') {
    return new StubGeocodingProvider();
  }
  if (PROVIDER === 'mapbox') {
    const TOKEN = process.env.MAPBOX_ACCESS_TOKEN ?? '';
    if (TOKEN.trim() !== '') {
      return new MapboxGeocodingProvider(TOKEN);
    }
    return new NoopGeocodingProvider();
  }
  if (PROVIDER === 'google') {
    return new NoopGeocodingProvider();
  }
  return new NoopGeocodingProvider();
}

export function buildGeoUseCasesSV(): {
  searchPlacesUC: SearchPlacesUseCase;
  getPlaceDetailsUC: GetPlaceDetailsUseCase;
  geocodeVenueUC: GeocodeVenueUseCase;
} {
  const PROVIDER = buildGeocodingProviderSV();
  const VENUE_GEOCODING_REPOSITORY = new PrismaVenueGeocodingRepository();
  return {
    searchPlacesUC: new SearchPlacesUseCase(PROVIDER),
    getPlaceDetailsUC: new GetPlaceDetailsUseCase(PROVIDER),
    geocodeVenueUC: new GeocodeVenueUseCase(VENUE_GEOCODING_REPOSITORY, PROVIDER),
  };
}

