import type {
  MatchListFiltersDTO,
  MatchRepository,
  OpenMatchDTO,
  PageDTO,
} from '../../domain/ports/match_repository.js';

import { PRISMA } from '../prisma_client.js';

export function computeOpenMatchDTOSV(_row: {
  id: string;
  sportId: string;
  categoryId: string;
  status: string;
  scheduledAt: Date | null;
  pricePerPlayerCents: number;
  maxParticipants: number;
  affectsElo: boolean;
  gender?: 'MALE' | 'FEMALE' | 'MIXED' | null;
  _count: { participants: number };
  category: { name: string } | null;
  participants: { userId: string; user: { name: string } }[];
  court: null | {
    name: string;
    venue: {
      name: string;
      pricingCurrency: string;
      displayCurrency: string;
      addressLine1: string | null;
      addressCity: string | null;
      formattedAddress: string | null;
      address: string | null;
      imageUrl: string | null;
    };
  };
}): OpenMatchDTO {
  const PARTICIPANT_COUNT = _row._count.participants;
  const OPEN_SPOTS = Math.max(0, _row.maxParticipants - PARTICIPANT_COUNT);

  const CLUB_NAME = _row.court?.venue.name;
  const COURT_NAME = _row.court?.name;
  const LOCATION_LABEL =
    _row.court?.venue.addressLine1 ??
    _row.court?.venue.formattedAddress ??
    _row.court?.venue.address ??
    _row.court?.venue.addressCity ??
    undefined;

  return {
    id: _row.id,
    sportId: _row.sportId,
    categoryId: _row.categoryId,
    ...(_row.category !== null ? { categoryName: _row.category.name } : {}),
    status: _row.status,
    scheduledAt: _row.scheduledAt,
    pricePerPlayerCents: _row.pricePerPlayerCents,
    maxParticipants: _row.maxParticipants,
    participantCount: PARTICIPANT_COUNT,
    openSpots: OPEN_SPOTS,
    ...(CLUB_NAME !== undefined ? { clubName: CLUB_NAME } : {}),
    ...(COURT_NAME !== undefined ? { courtName: COURT_NAME } : {}),
    ...(LOCATION_LABEL !== undefined ? { locationLabel: LOCATION_LABEL } : {}),
    pricingCurrency: _row.court?.venue.pricingCurrency,
    displayCurrency: _row.court?.venue.displayCurrency,
    participantPreview: _row.participants.map((_p) => ({
      userId: _p.userId,
      displayName: _p.user.name,
    })),
    affectsElo: _row.affectsElo,
    ...(_row.court?.venue.imageUrl != null ? { venueImageUrl: _row.court.venue.imageUrl } : {}),
    ...(_row.gender != null ? { gender: _row.gender } : {}),
  };
}

function kmToLatitudeDeltaSV(_km: number): number {
  return _km / 111;
}

function kmToLongitudeDeltaSV(_km: number, _atLatDegrees: number): number {
  const COS = Math.cos((_atLatDegrees * Math.PI) / 180);
  if (COS === 0) return 180;
  return _km / (111 * COS);
}

export class PrismaMatchRepository implements MatchRepository {
  async listOpenMatchesSV(
    _filters: MatchListFiltersDTO,
    _page: PageDTO,
  ): Promise<{ items: OpenMatchDTO[]; total: number }> {
    const WHERE = {
      sportId: _filters.sportId,
      status: _filters.status ?? 'SCHEDULED',
      ...(_filters.categoryId !== undefined ? { categoryId: _filters.categoryId } : {}),
      ...(_filters.gender !== undefined ? { gender: _filters.gender } : {}),
      ...(_filters.minPricePerPlayerCents !== undefined || _filters.maxPricePerPlayerCents !== undefined
        ? {
            pricePerPlayerCents: {
              ...(_filters.minPricePerPlayerCents !== undefined ? { gte: _filters.minPricePerPlayerCents } : {}),
              ...(_filters.maxPricePerPlayerCents !== undefined ? { lte: _filters.maxPricePerPlayerCents } : {}),
            },
          }
        : {}),
      ...(_filters.scheduledFrom !== undefined || _filters.scheduledTo !== undefined
        ? {
            scheduledAt: {
              ...(_filters.scheduledFrom !== undefined ? { gte: _filters.scheduledFrom } : {}),
              ...(_filters.scheduledTo !== undefined ? { lte: _filters.scheduledTo } : {}),
            },
          }
        : {}),
      ...(() => {
        const HAS_NEAR =
          _filters.nearLat !== undefined &&
          _filters.nearLng !== undefined &&
          _filters.radiusKm !== undefined &&
          _filters.radiusKm > 0;
        const HAS_VENUE = _filters.venueId !== undefined;

        if (!HAS_NEAR && !HAS_VENUE) return {};

        const LAT_DELTA = HAS_NEAR ? kmToLatitudeDeltaSV(_filters.radiusKm as number) : 0;
        const LNG_DELTA = HAS_NEAR
          ? kmToLongitudeDeltaSV(_filters.radiusKm as number, _filters.nearLat as number)
          : 0;

        return {
          court: {
            ...(HAS_VENUE ? { venueId: _filters.venueId } : {}),
            ...(HAS_NEAR
              ? {
                  venue: {
                    latitude: {
                      gte: (_filters.nearLat as number) - LAT_DELTA,
                      lte: (_filters.nearLat as number) + LAT_DELTA,
                    },
                    longitude: {
                      gte: (_filters.nearLng as number) - LNG_DELTA,
                      lte: (_filters.nearLng as number) + LNG_DELTA,
                    },
                  },
                }
              : {}),
          },
        };
      })(),
    };

    const SKIP = (_page.page - 1) * _page.limit;
    const TAKE = _page.limit;

    const [TOTAL, ROWS] = await PRISMA.$transaction([
      PRISMA.match.count({ where: WHERE }),
      PRISMA.match.findMany({
        where: WHERE,
        orderBy: [{ scheduledAt: 'asc' }, { createdAt: 'asc' }],
        skip: SKIP,
        take: TAKE,
        select: {
          id: true,
          sportId: true,
          categoryId: true,
          category: { select: { name: true } },
          status: true,
          scheduledAt: true,
          pricePerPlayerCents: true,
          maxParticipants: true,
          affectsElo: true,
          gender: true,
          _count: { select: { participants: true } },
          participants: {
            take: 4,
            select: {
              userId: true,
              user: { select: { name: true } },
            },
          },
          court: {
            select: {
              name: true,
              venue: {
                select: {
                  name: true,
                  pricingCurrency: true,
                  displayCurrency: true,
                  addressLine1: true,
                  addressCity: true,
                  formattedAddress: true,
                  address: true,
                  imageUrl: true,
                },
              },
            },
          },
        },
      }),
    ]);

    // Solo abiertas con cupos vacíos (openSpots > 0)
    const ITEMS = ROWS.map(computeOpenMatchDTOSV).filter((_m) => _m.openSpots > 0);

    return { items: ITEMS, total: TOTAL };
  }
}

