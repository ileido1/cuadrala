export type VenuePaymentInfoDTO = {
  paymentHolder: string | null;
  paymentBank: string | null;
  paymentCvu: string | null;
  paymentAlias: string | null;
  paymentNotes: string | null;
};

export type UpdateVenueDataDTO = {
  name?: string | null;
  address?: string | null;
  latitude?: number | null;
  longitude?: number | null;
  phone?: string | null;
  email?: string | null;
  description?: string | null;
  openingHours?: Record<string, { open: string; close: string }> | null;
};

export type VenueSettingsDTO = {
  id: string;
  name: string;
  phone: string | null;
  email: string | null;
  description: string | null;
  openingHours: unknown | null;
  address: string | null;
  latitude: number | null;
  longitude: number | null;
};

export type VenueListItemDTO = {
  id: string;
  name: string;
  address: string | null;
  latitude: number | null;
  longitude: number | null;
  displayCurrency: string;
  pricingCurrency: string;
  createdAt: Date;
  distanceKm?: number | null;
};

export type VenueDetailDTO = {
  id: string;
  name: string;
  address: string | null;
  phone: string | null;
  email: string | null;
  description: string | null;
  openingTime: string;
  closingTime: string;
  activeDays: string[];
  courtsCount: number;
  latitude: number | null;
  longitude: number | null;
  paymentHolder: string | null;
  paymentBank: string | null;
  paymentCvu: string | null;
  paymentAlias: string | null;
  paymentNotes: string | null;
};

export type VenuePaymentInfoWithNameDTO = VenuePaymentInfoDTO & {
  id: string;
  name: string;
};

export type CreateVenueInputDTO = {
  name: string;
  address?: string | null;
  latitude?: number | null;
  longitude?: number | null;
  paymentHolder?: string | null;
  paymentBank?: string | null;
  paymentCvu?: string | null;
  paymentAlias?: string | null;
  paymentNotes?: string | null;
  ownerUserId?: string | null;
};

export type PageDTO = {
  page: number;
  limit: number;
};

export interface VenueRepository {
  findByIdSV(_venueId: string): Promise<{ id: string; name: string } | null>;
  updateSV(_venueId: string, _data: UpdateVenueDataDTO): Promise<VenueSettingsDTO>;
  getPaymentInfoSV(_venueId: string): Promise<VenuePaymentInfoDTO | null>;
  listVenuesSV(_page: PageDTO): Promise<{ items: VenueListItemDTO[]; total: number }>;
  listVenuesNearSV(
    _input: PageDTO & { lat: number; lng: number; radiusKm: number },
  ): Promise<{ items: VenueListItemDTO[]; total: number }>;
  listVenuesForUserSV(_userId: string): Promise<VenueListItemDTO[]>;
  createVenueSV(_input: CreateVenueInputDTO): Promise<VenueListItemDTO>;
  getVenueDetailSV(_venueId: string): Promise<VenueDetailDTO | null>;
  getPaymentInfoWithNameSV(_venueId: string): Promise<VenuePaymentInfoWithNameDTO | null>;
}
