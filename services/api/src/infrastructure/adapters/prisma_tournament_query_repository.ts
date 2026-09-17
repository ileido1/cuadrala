import {
  haversineDistanceKmSV,
  kmToLatitudeDeltaSV,
  kmToLongitudeDeltaSV,
} from '../../domain/geo/geo_distance.js';
import type {
  ListTournamentsFiltersDTO,
  PageDTO,
  RegistrationDTO,
  TournamentDetailDTO,
  TournamentListItemDTO,
  TournamentQueryRepository,
  ViewerTournamentItemDTO,
} from '../../domain/ports/tournament_query_repository.js';

import type { Prisma } from '../../generated/prisma/client.js';
import { PRISMA } from '../prisma_client.js';

export function toListItemDTO(_row: {
  id: string;
  name: string;
  status: 'DRAFT' | 'OPEN' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED';
  visibility: 'PUBLIC' | 'PRIVATE';
  organizerUserId: string | null;
  organizer: { name: string } | null;
  sportId: string;
  sport: { name: string };
  categoryId: string;
  category: { name: string };
  startsAt: Date | null;
  endsAt: Date | null;
  venueId: string | null;
  venue: { name: string } | null;
  inscriptionPrice: Prisma.Decimal | null;
  maxSlots: number | null;
  registrationClosesAt: Date | null;
  gender: TournamentListItemDTO['gender'];
  _count: { registrations: number };
  distanceKm?: number;
}): TournamentListItemDTO {
  return {
    id: _row.id,
    name: _row.name,
    status: _row.status,
    visibility: _row.visibility,
    organizerUserId: _row.organizerUserId,
    organizerName: _row.organizer?.name ?? null,
    sportId: _row.sportId,
    sportName: _row.sport.name,
    categoryId: _row.categoryId,
    categoryName: _row.category.name,
    startsAt: _row.startsAt != null ? _row.startsAt.toISOString() : null,
    endsAt: _row.endsAt != null ? _row.endsAt.toISOString() : null,
    registrationCount: _row._count.registrations,
    venueId: _row.venueId,
    venueName: _row.venue?.name ?? null,
    //? Decimal de Prisma no serializa como número en JSON: sin toNumber() el
    //? cliente recibe un objeto y el precio se muestra vacío.
    inscriptionPrice: _row.inscriptionPrice === null ? null : _row.inscriptionPrice.toNumber(),
    maxSlots: _row.maxSlots,
    registrationClosesAt:
      _row.registrationClosesAt != null ? _row.registrationClosesAt.toISOString() : null,
    gender: _row.gender,
    //? distanceKm solo se agrega cuando el listado se filtró por `near`: su
    //? ausencia (no `null`) es lo que el contrato usa para decir "no se pidió".
    ...(_row.distanceKm !== undefined ? { distanceKm: _row.distanceKm } : {}),
  };
}

/**
 * @name    :buildViewerTournamentItemsSV
 * @version :1.0.0
 * @description :Combina torneos, inscripciones vigentes, invitaciones
 * pendientes y torneos organizados en un `ViewerTournamentItemDTO` por
 * torneo. Es una funcion pura para poder probar la logica de combinacion
 * (roles, conteo solo para organizador) sin tocar Prisma.
 * @param {object} _input - Torneos y las piezas ya resueltas por el llamador.
 * @returns {ViewerTournamentItemDTO[]}
 */
export function buildViewerTournamentItemsSV(_input: {
  tournaments: TournamentListItemDTO[];
  registrations: { tournamentId: string; status: 'PENDING' | 'CONFIRMED' }[];
  invitations: { tournamentId: string; id: string }[];
  organizerTournamentIds: string[];
  pendingRegistrationCounts: { tournamentId: string; count: number }[];
}): ViewerTournamentItemDTO[] {
  const REGISTRATION_STATUS_BY_TOURNAMENT_ID = new Map(
    _input.registrations.map((_r) => [_r.tournamentId, _r.status]),
  );
  const PENDING_INVITATION_ID_BY_TOURNAMENT_ID = new Map(
    _input.invitations.map((_i) => [_i.tournamentId, _i.id]),
  );
  const ORGANIZER_TOURNAMENT_IDS = new Set(_input.organizerTournamentIds);
  const PENDING_COUNT_BY_TOURNAMENT_ID = new Map(
    _input.pendingRegistrationCounts.map((_c) => [_c.tournamentId, _c.count]),
  );

  return _input.tournaments.map((_tournament) => {
    const IS_ORGANIZER = ORGANIZER_TOURNAMENT_IDS.has(_tournament.id);

    return {
      tournament: _tournament,
      registrationStatus: REGISTRATION_STATUS_BY_TOURNAMENT_ID.get(_tournament.id) ?? null,
      pendingInvitationId: PENDING_INVITATION_ID_BY_TOURNAMENT_ID.get(_tournament.id) ?? null,
      isOrganizer: IS_ORGANIZER,
      //? El conteo solo tiene sentido para quien administra el torneo: a un
      //? inscrito o invitado no le corresponde ver cuanta gente espera.
      pendingRegistrationsCount: IS_ORGANIZER
        ? (PENDING_COUNT_BY_TOURNAMENT_ID.get(_tournament.id) ?? 0)
        : null,
    };
  });
}

const TOURNAMENT_LIST_SELECT = {
  id: true,
  name: true,
  status: true,
  visibility: true,
  organizerUserId: true,
  organizer: { select: { name: true } },
  sportId: true,
  sport: { select: { name: true } },
  categoryId: true,
  category: { select: { name: true } },
  startsAt: true,
  endsAt: true,
  venueId: true,
  venue: { select: { name: true } },
  inscriptionPrice: true,
  maxSlots: true,
  registrationClosesAt: true,
  gender: true,
  _count: { select: { registrations: true } },
} as const;

export class PrismaTournamentQueryRepository implements TournamentQueryRepository {
  async listTournamentsSV(
    _filters: ListTournamentsFiltersDTO,
    _page: PageDTO,
  ): Promise<{ items: TournamentListItemDTO[]; total: number }> {
    const WHERE: {
      status?: 'DRAFT' | 'OPEN' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED';
      visibility?: 'PUBLIC' | 'PRIVATE';
      sportId?: string;
      categoryId?: string;
      startsAt?: { gte?: Date; lte?: Date };
      OR?: Array<{ venueId: string } | { matches: { some: { court: { venueId: string } } } }>;
    } = {
      //? Catálogo público: solo torneos PUBLIC (los PRIVATE solo por link directo).
      visibility: 'PUBLIC',
      ...(_filters.status !== undefined ? { status: _filters.status } : {}),
      ...(_filters.sportId !== undefined ? { sportId: _filters.sportId } : {}),
      ...(_filters.categoryId !== undefined ? { categoryId: _filters.categoryId } : {}),
      //? La sede propia del torneo O la de sus canchas. Solo mirar los partidos
      //? escondia los torneos recien creados, que todavia no tienen ninguno;
      //? solo mirar la columna dejaria afuera a los torneos viejos, creados
      //? cuando la ruta de alta no aceptaba `venueId`.
      ...(_filters.venueId !== undefined
        ? {
            OR: [
              { venueId: _filters.venueId },
              { matches: { some: { court: { venueId: _filters.venueId } } } },
            ],
          }
        : {}),
      ...(_filters.startsAtFrom !== undefined || _filters.startsAtTo !== undefined
        ? {
            startsAt: {
              ...(_filters.startsAtFrom !== undefined
                ? { gte: new Date(_filters.startsAtFrom) }
                : {}),
              ...(_filters.startsAtTo !== undefined ? { lte: new Date(_filters.startsAtTo) } : {}),
            },
          }
        : {}),
    };

    if (_filters.near !== undefined) {
      return this._listTournamentsNearSV(WHERE, _filters.near, _page);
    }

    const SKIP = (_page.page - 1) * _page.limit;
    const TAKE = _page.limit;

    const [TOTAL, ROWS] = await PRISMA.$transaction([
      PRISMA.tournament.count({ where: WHERE }),
      PRISMA.tournament.findMany({
        where: WHERE,
        orderBy: [{ startsAt: 'asc' }, { createdAt: 'desc' }],
        skip: SKIP,
        take: TAKE,
        select: TOURNAMENT_LIST_SELECT,
      }),
    ]);

    return { items: ROWS.map(toListItemDTO), total: TOTAL };
  }

  /**
   * @name    :_listTournamentsNearSV
   * @version :1.0.0
   * @description :Filtra por la sede del torneo dentro de `radiusKm`, igual
   * que `PrismaVenueRepository.listVenuesNearSV`: bounding box en la consulta
   * (rápido, aproximado) y haversine exacto en memoria para filtrar y ordenar
   * por distancia real. Un torneo sin sede no matchea el filtro anidado sobre
   * `venue` y queda afuera — no hay forma de saber si está "cerca".
   * @param {object} _baseWhere - Filtros ya resueltos (status, sportId, etc.), sin `near`.
   * @param {object} _near - Centro y radio de búsqueda.
   * @param {PageDTO} _page - Paginación a aplicar sobre el resultado ya ordenado por distancia.
   * @returns {Promise<{items: TournamentListItemDTO[]; total: number}>}
   */
  private async _listTournamentsNearSV(
    _baseWhere: Prisma.TournamentWhereInput,
    _near: { lat: number; lng: number; radiusKm: number },
    _page: PageDTO,
  ): Promise<{ items: TournamentListItemDTO[]; total: number }> {
    const LAT_DELTA = kmToLatitudeDeltaSV(_near.radiusKm);
    const LNG_DELTA = kmToLongitudeDeltaSV(_near.radiusKm, _near.lat);

    const ROWS = await PRISMA.tournament.findMany({
      where: {
        ..._baseWhere,
        venue: {
          latitude: { gte: _near.lat - LAT_DELTA, lte: _near.lat + LAT_DELTA },
          longitude: { gte: _near.lng - LNG_DELTA, lte: _near.lng + LNG_DELTA },
        },
      },
      select: {
        ...TOURNAMENT_LIST_SELECT,
        venue: { select: { name: true, latitude: true, longitude: true } },
      },
    });

    const WITH_DISTANCE = ROWS.filter(
      (_r) => _r.venue?.latitude != null && _r.venue.longitude != null,
    )
      .map((_r) => ({
        ..._r,
        distanceKm: haversineDistanceKmSV(
          _near.lat,
          _near.lng,
          _r.venue!.latitude as number,
          _r.venue!.longitude as number,
        ),
      }))
      .filter((_r) => _r.distanceKm <= _near.radiusKm)
      .sort((_a, _b) => _a.distanceKm - _b.distanceKm);

    const SKIP = (_page.page - 1) * _page.limit;

    return {
      items: WITH_DISTANCE.slice(SKIP, SKIP + _page.limit).map(toListItemDTO),
      total: WITH_DISTANCE.length,
    };
  }

  async getTournamentByIdSV(_tournamentId: string): Promise<TournamentDetailDTO | null> {
    const ROW = await PRISMA.tournament.findUnique({
      where: { id: _tournamentId },
      select: {
        id: true,
        name: true,
        status: true,
        visibility: true,
        organizerUserId: true,
        organizer: { select: { name: true } },
        sportId: true,
        sport: { select: { name: true } },
        categoryId: true,
        category: { select: { name: true } },
        startsAt: true,
        endsAt: true,
        venueId: true,
        venue: { select: { name: true } },
        inscriptionPrice: true,
        maxSlots: true,
        registrationClosesAt: true,
        gender: true,
        formatPresetId: true,
        formatPreset: { select: { code: true } },
        presetSchemaVersion: true,
        formatParameters: true,
        createdAt: true,
        updatedAt: true,
        _count: { select: { registrations: true } },
      },
    });

    if (ROW === null) return null;

    const BASE = toListItemDTO(ROW);
    return {
      ...BASE,
      formatPresetId: ROW.formatPresetId,
      formatPresetName: ROW.formatPreset.code,
      presetSchemaVersion: ROW.presetSchemaVersion,
      formatParameters: ROW.formatParameters as Record<string, unknown> | null,
      createdAt: ROW.createdAt.toISOString(),
      updatedAt: ROW.updatedAt.toISOString(),
    };
  }

  async listTournamentRegistrationsSV(_tournamentId: string): Promise<RegistrationDTO[]> {
    const ROWS = await PRISMA.tournamentRegistration.findMany({
      where: { tournamentId: _tournamentId },
      select: {
        id: true,
        userId: true,
        guestName: true,
        status: true,
        createdAt: true,
        user: { select: { name: true } },
      },
      orderBy: { createdAt: 'asc' },
    });

    return ROWS.map((_r) => ({
      id: _r.id,
      userId: _r.userId,
      userName: _r.user?.name ?? null,
      guestName: _r.guestName,
      status: _r.status,
      createdAt: _r.createdAt.toISOString(),
    }));
  }

  async listTournamentsByVenueSV(
    _venueId: string,
    _filters: ListTournamentsFiltersDTO,
    _page: PageDTO,
  ): Promise<{ items: TournamentListItemDTO[]; total: number }> {
    const WHERE: {
      status?: 'DRAFT' | 'OPEN' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED';
      sportId?: string;
      categoryId?: string;
      OR?: Array<{ venueId: string } | { matches: { some: { court: { venueId: string } } } }>;
    } = {
      //? Mismo criterio que el listado global: la sede propia del torneo o la
      //? de sus canchas. Ver el comentario en listTournamentsSV.
      OR: [{ venueId: _venueId }, { matches: { some: { court: { venueId: _venueId } } } }],
      ...(_filters.status !== undefined ? { status: _filters.status } : {}),
      ...(_filters.sportId !== undefined ? { sportId: _filters.sportId } : {}),
      ...(_filters.categoryId !== undefined ? { categoryId: _filters.categoryId } : {}),
    };

    const SKIP = (_page.page - 1) * _page.limit;
    const TAKE = _page.limit;

    const [TOTAL, ROWS] = await PRISMA.$transaction([
      PRISMA.tournament.count({ where: WHERE }),
      PRISMA.tournament.findMany({
        where: WHERE,
        orderBy: [{ startsAt: 'asc' }, { createdAt: 'desc' }],
        skip: SKIP,
        take: TAKE,
        select: {
          id: true,
          name: true,
          status: true,
          visibility: true,
          organizerUserId: true,
          organizer: { select: { name: true } },
          sportId: true,
          sport: { select: { name: true } },
          categoryId: true,
          category: { select: { name: true } },
          startsAt: true,
          endsAt: true,
          venueId: true,
          venue: { select: { name: true } },
          inscriptionPrice: true,
          maxSlots: true,
          registrationClosesAt: true,
          gender: true,
          _count: { select: { registrations: true } },
        },
      }),
    ]);

    return { items: ROWS.map(toListItemDTO), total: TOTAL };
  }

  async listViewerTournamentsSV(_userId: string): Promise<ViewerTournamentItemDTO[]> {
    const [REGISTRATIONS, INVITATIONS, ORGANIZED_TOURNAMENTS] = await Promise.all([
      PRISMA.tournamentRegistration.findMany({
        where: { userId: _userId, status: { in: ['PENDING', 'CONFIRMED'] } },
        select: { tournamentId: true, status: true },
      }),
      PRISMA.tournamentInvitation.findMany({
        where: { invitedUserId: _userId, status: 'PENDING' },
        select: { id: true, tournamentId: true },
      }),
      PRISMA.tournament.findMany({
        where: { organizerUserId: _userId },
        select: { id: true },
      }),
    ]);

    const ORGANIZER_TOURNAMENT_IDS = ORGANIZED_TOURNAMENTS.map((_t) => _t.id);
    //? Un torneo puede llegar por mas de una via (organizador que tambien se
    //? inscribio); el Set dedupe antes de pedir los detalles.
    const TOURNAMENT_IDS = [
      ...new Set([
        ...REGISTRATIONS.map((_r) => _r.tournamentId),
        ...INVITATIONS.map((_i) => _i.tournamentId),
        ...ORGANIZER_TOURNAMENT_IDS,
      ]),
    ];

    if (TOURNAMENT_IDS.length === 0) return [];

    const [TOURNAMENT_ROWS, PENDING_COUNTS] = await Promise.all([
      PRISMA.tournament.findMany({
        where: { id: { in: TOURNAMENT_IDS } },
        select: TOURNAMENT_LIST_SELECT,
      }),
      ORGANIZER_TOURNAMENT_IDS.length === 0
        ? Promise.resolve([])
        : PRISMA.tournamentRegistration.groupBy({
            by: ['tournamentId'],
            where: { tournamentId: { in: ORGANIZER_TOURNAMENT_IDS }, status: 'PENDING' },
            _count: { _all: true },
          }),
    ]);

    return buildViewerTournamentItemsSV({
      tournaments: TOURNAMENT_ROWS.map(toListItemDTO),
      registrations: REGISTRATIONS.map((_r) => ({
        tournamentId: _r.tournamentId,
        status: _r.status as 'PENDING' | 'CONFIRMED',
      })),
      invitations: INVITATIONS,
      organizerTournamentIds: ORGANIZER_TOURNAMENT_IDS,
      pendingRegistrationCounts: PENDING_COUNTS.map((_c) => ({
        tournamentId: _c.tournamentId,
        count: _c._count._all,
      })),
    });
  }
}
