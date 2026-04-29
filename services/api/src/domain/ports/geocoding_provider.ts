export type GeocodingPlaceCandidateDTO = {
  placeId: string;
  name: string;
  formattedAddress: string | null;
  lat: number;
  lng: number;
};

export type GeocodingPlaceDetailsDTO = {
  placeId: string;
  name: string;
  formattedAddress: string | null;
  lat: number;
  lng: number;
  addressCountry: string | null;
  addressState: string | null;
  addressCity: string | null;
  addressLine1: string | null;
  addressPostalCode: string | null;
};

export interface GeocodingProvider {
  searchPlacesSV(_dto: {
    query: string;
    nearLat?: number;
    nearLng?: number;
    limit?: number;
  }): Promise<GeocodingPlaceCandidateDTO[]>;

  getPlaceDetailsSV(_placeId: string): Promise<GeocodingPlaceDetailsDTO>;
}

