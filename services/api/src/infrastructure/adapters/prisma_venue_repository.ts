import type {
  CreateVenueInputDTO,
  PageDTO,
  UpdateVenueDataDTO,
  VenueDetailDTO,
  VenueListItemDTO,
  VenuePaymentInfoDTO,
  VenuePaymentInfoWithNameDTO,
  VenueRepository,
  VenueSettingsDTO,
} from '../../domain/ports/venue_repository.js';
import type { PrismaClient } from '../../generated/prisma/client.js';

const VENUE_LIST_SELECT = {
  id: true,
  name: true,
  address: true,
  latitude: true,
  longitude: true,
  displayCurrency: true,
  pricingCurrency: true,
  createdAt: true,
} as const;

function kmToLatitudeDeltaSV(_radiusKm: number): number {
  return _radiusKm / 110.574;
}

function kmToLongitudeDeltaSV(_radiusKm: number, _lat: number): number {
  const LAT_RAD = (_lat * Math.PI) / 180;
  const KM_PER_DEG = 111.320 * Math.cos(LAT_RAD);
  return _radiusKm / Math.max(1e-6, KM_PER_DEG);
}

function haversineKmSV(_lat1: number, _lng1: number, _lat2: number, _lng2: number): number {
  const R = 6371;
  const D_LAT = ((_lat2 - _lat1) * Math.PI) / 180;
  const D_LNG = ((_lng2 - _lng1) * Math.PI) / 180;
  const A =
    Math.sin(D_LAT / 2) * Math.sin(D_LAT / 2)
    + Math.cos((_lat1 * Math.PI) / 180)
      * Math.cos((_lat2 * Math.PI) / 180)
      * Math.sin(D_LNG / 2)
      * Math.sin(D_LNG / 2);
  const C = 2 * Math.atan2(Math.sqrt(A), Math.sqrt(1 - A));
  return R * C;
}

function mapVenueDetailSV(_venue: {
  id: string;
  name: string;
  address: string | null;
  phone: string | null;
  email: string | null;
  description: string | null;
  openingHours: unknown;
  latitude: number | null;
  longitude: number | null;
  paymentHolder: string | null;
  paymentBank: string | null;
  paymentCvu: string | null;
  paymentAlias: string | null;
  paymentNotes: string | null;
  displayCurrency: string;
  pricingCurrency: string;
  monetizationSettings: { timezone: string } | null;
  _count: { courts: number };
}): VenueDetailDTO {
  const OPENING_HOURS = _venue.openingHours as Record<string, { open: string; close: string }> | null;

  return {
    id: _venue.id,
    name: _venue.name,
    address: _venue.address,
    phone: _venue.phone,
    email: _venue.email,
    description: _venue.description,
    openingHours: OPENING_HOURS,
    openingTime: OPENING_HOURS?.monday?.open ?? '08:00',
    closingTime: OPENING_HOURS?.monday?.close ?? '23:00',
    activeDays: OPENING_HOURS
      ? Object.keys(OPENING_HOURS).map((_d) => _d.slice(0, 3).toLowerCase())
      : ['mon', 'tue', 'wed', 'thu', 'fri', 'sat'],
    courtsCount: _venue._count.courts,
    latitude: _venue.latitude,
    longitude: _venue.longitude,
    paymentHolder: _venue.paymentHolder,
    paymentBank: _venue.paymentBank,
    paymentCvu: _venue.paymentCvu,
    paymentAlias: _venue.paymentAlias,
    paymentNotes: _venue.paymentNotes,
    displayCurrency: _venue.displayCurrency,
    pricingCurrency: _venue.pricingCurrency,
    timezone: _venue.monetizationSettings?.timezone ?? 'America/Caracas',
  };
}

export class PrismaVenueRepository implements VenueRepository {
  constructor(private readonly _prisma: PrismaClient) {}
  async findByIdSV(_venueId: string): Promise<{ id: string; name: string } | null> {
    return this._prisma.venue.findUnique({
      where: { id: _venueId },
      select: { id: true, name: true },
    });
  }

  async getOpeningHoursSV(
    _venueId: string,
  ): Promise<Record<string, { open: string; close: string }> | null> {
    const ROW = await this._prisma.venue.findUnique({
      where: { id: _venueId },
      select: { openingHours: true },
    });
    if (!ROW) {
      return null;
    }
    return ROW.openingHours as Record<string, { open: string; close: string }> | null;
  }

  async updateSV(_venueId: string, _data: UpdateVenueDataDTO): Promise<VenueSettingsDTO> {
    const UPDATED = await this._prisma.venue.update({
      where: { id: _venueId },
      data: {
        ...(_data.name !== undefined ? { name: _data.name } : {}),
        ...(_data.address !== undefined ? { address: _data.address } : {}),
        ...(_data.latitude !== undefined ? { latitude: _data.latitude } : {}),
        ...(_data.longitude !== undefined ? { longitude: _data.longitude } : {}),
        ...(_data.phone !== undefined ? { phone: _data.phone } : {}),
        ...(_data.email !== undefined ? { email: _data.email } : {}),
        ...(_data.description !== undefined ? { description: _data.description } : {}),
        ...(_data.openingHours !== undefined
          ? { openingHours: _data.openingHours as object }
          : {}),
        ...(_data.pricingCurrency !== undefined
          ? { pricingCurrency: _data.pricingCurrency }
          : {}),
        ...(_data.displayCurrency !== undefined
          ? { displayCurrency: _data.displayCurrency }
          : {}),
      },
      select: {
        id: true,
        name: true,
        phone: true,
        email: true,
        description: true,
        openingHours: true,
        address: true,
        latitude: true,
        longitude: true,
        pricingCurrency: true,
        displayCurrency: true,
      },
    });

    return {
      id: UPDATED.id,
      name: UPDATED.name,
      phone: UPDATED.phone,
      email: UPDATED.email,
      description: UPDATED.description,
      openingHours: UPDATED.openingHours,
      address: UPDATED.address,
      latitude: UPDATED.latitude,
      longitude: UPDATED.longitude,
      pricingCurrency: UPDATED.pricingCurrency,
      displayCurrency: UPDATED.displayCurrency,
    };
  }

  async getPaymentInfoSV(_venueId: string): Promise<VenuePaymentInfoDTO | null> {
    return this._prisma.venue.findUnique({
      where: { id: _venueId },
      select: {
        paymentHolder: true,
        paymentBank: true,
        paymentCvu: true,
        paymentAlias: true,
        paymentNotes: true,
      },
    });
  }

  async listVenuesSV(_page: PageDTO): Promise<{ items: VenueListItemDTO[]; total: number }> {
    const SKIP = (_page.page - 1) * _page.limit;
    const [TOTAL, ROWS] = await this._prisma.$transaction([
      this._prisma.venue.count(),
      this._prisma.venue.findMany({
        orderBy: [{ createdAt: 'desc' }],
        skip: SKIP,
        take: _page.limit,
        select: VENUE_LIST_SELECT,
      }),
    ]);
    return { items: ROWS, total: TOTAL };
  }

  async listVenuesNearSV(
    _input: PageDTO & { lat: number; lng: number; radiusKm: number },
  ): Promise<{ items: VenueListItemDTO[]; total: number }> {
    const SKIP = (_input.page - 1) * _input.limit;
    const LAT_DELTA = kmToLatitudeDeltaSV(_input.radiusKm);
    const LNG_DELTA = kmToLongitudeDeltaSV(_input.radiusKm, _input.lat);

    const ROWS = await this._prisma.venue.findMany({
      where: {
        latitude: { gte: _input.lat - LAT_DELTA, lte: _input.lat + LAT_DELTA },
        longitude: { gte: _input.lng - LNG_DELTA, lte: _input.lng + LNG_DELTA },
      },
      select: VENUE_LIST_SELECT,
    });

    const WITH_DISTANCE = ROWS.map((_v) => ({
      ..._v,
      distanceKm:
        _v.latitude === null || _v.longitude === null
          ? null
          : haversineKmSV(_input.lat, _input.lng, _v.latitude, _v.longitude),
    }))
      .filter((_v) => _v.distanceKm === null || _v.distanceKm <= _input.radiusKm)
      .sort(
        (_a, _b) =>
          (_a.distanceKm ?? Number.POSITIVE_INFINITY)
          - (_b.distanceKm ?? Number.POSITIVE_INFINITY),
      );

    return {
      items: WITH_DISTANCE.slice(SKIP, SKIP + _input.limit),
      total: WITH_DISTANCE.length,
    };
  }

  async listVenuesForUserSV(_userId: string): Promise<VenueListItemDTO[]> {
    return this._prisma.venue.findMany({
      where: {
        OR: [
          { ownerUserId: _userId },
          { staff: { some: { userId: _userId } } },
        ],
      },
      select: VENUE_LIST_SELECT,
      orderBy: { createdAt: 'desc' },
    });
  }

  async createVenueSV(_input: CreateVenueInputDTO): Promise<VenueListItemDTO> {
    return this._prisma.$transaction(async (_tx) => {
      const VENUE = await _tx.venue.create({
        data: {
          name: _input.name,
          address: _input.address ?? null,
          latitude: _input.latitude ?? null,
          longitude: _input.longitude ?? null,
          paymentHolder: _input.paymentHolder ?? null,
          paymentBank: _input.paymentBank ?? null,
          paymentCvu: _input.paymentCvu ?? null,
          paymentAlias: _input.paymentAlias ?? null,
          paymentNotes: _input.paymentNotes ?? null,
          ownerUserId: _input.ownerUserId ?? null,
        },
        select: VENUE_LIST_SELECT,
      });

      if (_input.ownerUserId !== undefined && _input.ownerUserId !== null) {
        await _tx.venueStaff.create({
          data: {
            venueId: VENUE.id,
            userId: _input.ownerUserId,
            role: 'OWNER',
          },
        });
      }

      return VENUE;
    });
  }

  async getVenueDetailSV(_venueId: string): Promise<VenueDetailDTO | null> {
    const VENUE = await this._prisma.venue.findUnique({
      where: { id: _venueId },
      select: {
        id: true,
        name: true,
        address: true,
        phone: true,
        email: true,
        description: true,
        openingHours: true,
        latitude: true,
        longitude: true,
        paymentHolder: true,
        paymentBank: true,
        paymentCvu: true,
        paymentAlias: true,
        paymentNotes: true,
        displayCurrency: true,
        pricingCurrency: true,
        monetizationSettings: { select: { timezone: true } },
        _count: { select: { courts: true } },
      },
    });

    return VENUE === null ? null : mapVenueDetailSV(VENUE);
  }

  async getPaymentInfoWithNameSV(
    _venueId: string,
  ): Promise<VenuePaymentInfoWithNameDTO | null> {
    return this._prisma.venue.findUnique({
      where: { id: _venueId },
      select: {
        id: true,
        name: true,
        paymentHolder: true,
        paymentBank: true,
        paymentCvu: true,
        paymentAlias: true,
        paymentNotes: true,
      },
    });
  }
}
