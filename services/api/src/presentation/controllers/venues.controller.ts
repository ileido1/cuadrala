import type { Request, Response } from 'express';

import { AppError } from '../../domain/errors/app_error.js';
import { PRISMA } from '../../infrastructure/prisma_client.js';
import {
  COURT_ID_PARAM_SCHEMA,
  CREATE_COURT_BODY_SCHEMA,
  CREATE_VENUE_BODY_SCHEMA,
  LIST_COURTS_QUERY_SCHEMA,
  LIST_VENUES_QUERY_SCHEMA,
  UPDATE_COURT_BODY_SCHEMA,
  VENUE_ID_PARAM_SCHEMA,
} from '../validation/venues.validation.js';
import { CreateCourtUseCase, ListCourtsUseCase, UpdateCourtUseCase, CancelCourtUseCase } from '../../application/use_cases/court.use_cases.js';
import type { CreateCourtInputDTO, ListCourtsInputDTO, UpdateCourtInputDTO, CancelCourtInputDTO } from '../../application/use_cases/court.use_cases.js';
import { courtRepositoryFactory, createCourtRepo, getCourtByIdRepo, listCourtsByVenueRepo, updateCourtRepo, cancelCourtRepo } from '../../infrastructure/repositories/court_repository_factory.js';

function parseNearSV(_near: string): { lat: number; lng: number } {
  const [LAT_STR, LNG_STR] = _near.split(',');
  const LAT = Number(LAT_STR);
  const LNG = Number(LNG_STR);
  return { lat: LAT, lng: LNG };
}

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
  const dLat = ((_lat2 - _lat1) * Math.PI) / 180;
  const dLng = ((_lng2 - _lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((_lat1 * Math.PI) / 180) *
      Math.cos((_lat2 * Math.PI) / 180) *
      Math.sin(dLng / 2) *
      Math.sin(dLng / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

export async function getVenuesCON(_req: Request, _res: Response): Promise<void> {
  const QUERY = LIST_VENUES_QUERY_SCHEMA.parse(_req.query);
  const SKIP = (QUERY.page - 1) * QUERY.limit;

  if (QUERY.near === undefined) {
    const [TOTAL, ROWS] = await PRISMA.$transaction([
      PRISMA.venue.count(),
      PRISMA.venue.findMany({
        orderBy: [{ createdAt: 'desc' }],
        skip: SKIP,
        take: QUERY.limit,
        select: { id: true, name: true, address: true, latitude: true, longitude: true, createdAt: true },
      }),
    ]);

    _res.status(200).json({
      success: true,
      message: 'Sedes obtenidas correctamente.',
      data: { items: ROWS, pageInfo: { page: QUERY.page, limit: QUERY.limit, total: TOTAL } },
    });
    return;
  }

  const { lat, lng } = parseNearSV(QUERY.near);
  const LAT_DELTA = kmToLatitudeDeltaSV(QUERY.radiusKm);
  const LNG_DELTA = kmToLongitudeDeltaSV(QUERY.radiusKm, lat);

  const WHERE = {
    latitude: { gte: lat - LAT_DELTA, lte: lat + LAT_DELTA },
    longitude: { gte: lng - LNG_DELTA, lte: lng + LNG_DELTA },
  };

  const ROWS = await PRISMA.venue.findMany({
    where: WHERE,
    select: { id: true, name: true, address: true, latitude: true, longitude: true, createdAt: true },
  });

  const WITH_DISTANCE = ROWS.map((_v) => ({
    ..._v,
    distanceKm:
      _v.latitude === null || _v.longitude === null ? null : haversineKmSV(lat, lng, _v.latitude, _v.longitude),
  }))
    .filter((_v) => _v.distanceKm === null || _v.distanceKm <= QUERY.radiusKm)
    .sort((_a, _b) => (_a.distanceKm ?? Number.POSITIVE_INFINITY) - (_b.distanceKm ?? Number.POSITIVE_INFINITY));

  const ITEMS = WITH_DISTANCE.slice(SKIP, SKIP + QUERY.limit);

  _res.status(200).json({
    success: true,
    message: 'Sedes obtenidas correctamente.',
    data: { items: ITEMS, pageInfo: { page: QUERY.page, limit: QUERY.limit, total: WITH_DISTANCE.length } },
  });
}

export async function postVenueCON(_req: Request, _res: Response): Promise<void> {
  const BODY = CREATE_VENUE_BODY_SCHEMA.parse(_req.body);

  if (BODY.ownerUserId !== undefined) {
    const USER = await PRISMA.user.findUnique({ where: { id: BODY.ownerUserId } });
    if (USER === null) {
      throw new AppError('USUARIO_NO_ENCONTRADO', 'El usuario indicado como propietario no existe.', 400);
    }
  }

  const CREATED = await PRISMA.$transaction(async (_tx) => {
    const VENUE = await _tx.venue.create({
      data: {
        name: BODY.name,
        address: BODY.address ?? null,
        latitude: BODY.latitude ?? null,
        longitude: BODY.longitude ?? null,
        paymentHolder: BODY.paymentHolder ?? null,
        paymentBank: BODY.paymentBank ?? null,
        paymentCvu: BODY.paymentCvu ?? null,
        paymentAlias: BODY.paymentAlias ?? null,
        paymentNotes: BODY.paymentNotes ?? null,
        ownerUserId: BODY.ownerUserId ?? null,
      },
      select: { id: true, name: true, address: true, latitude: true, longitude: true, createdAt: true },
    });

    if (BODY.ownerUserId !== undefined) {
      await _tx.venueStaff.create({
        data: {
          venueId: VENUE.id,
          userId: BODY.ownerUserId,
          role: 'OWNER',
        },
      });
    }

    return VENUE;
  });

  _res.status(201).json({
    success: true,
    message: 'Sede creada correctamente.',
    data: CREATED,
  });
}

export async function postCourtCON(_req: Request, _res: Response): Promise<void> {
  const PARAMS = VENUE_ID_PARAM_SCHEMA.parse(_req.params);
  const BODY = CREATE_COURT_BODY_SCHEMA.parse(_req.body);

  // Verificar que la sede existe
  const VENUE = await PRISMA.venue.findUnique({ where: { id: PARAMS.venueId }, select: { id: true } });
  if (VENUE === null) {
    throw new AppError('SEDE_NO_ENCONTRADA', 'La sede indicada no existe.', 404);
  }

  const INPUT: { venueId: string; name: string; sportType?: 'PADEL' | 'TENNIS'; indoor?: boolean; lighting?: boolean; surfaceType?: string | null } = {
    venueId: PARAMS.venueId,
    name: BODY.name,
    ...(BODY.sportType !== undefined ? { sportType: BODY.sportType } : {}),
    ...(BODY.indoor !== undefined ? { indoor: BODY.indoor } : {}),
    ...(BODY.lighting !== undefined ? { lighting: BODY.lighting } : {}),
    ...(BODY.surfaceType !== undefined ? { surfaceType: BODY.surfaceType } : {}),
  };
  const useCase = new CreateCourtUseCase({ create: createCourtRepo, findById: getCourtByIdRepo, findByVenue: listCourtsByVenueRepo, update: updateCourtRepo, cancel: cancelCourtRepo } as any);
  const result = await useCase.executeSV(INPUT as CreateCourtInputDTO);

  _res.status(201).json({
    success: true,
    message: 'Cancha creada correctamente.',
    data: result.court,
  });
}

export async function getVenueCourtsCON(_req: Request, _res: Response): Promise<void> {
  const PARAMS = VENUE_ID_PARAM_SCHEMA.parse(_req.params);
  const QUERY = LIST_COURTS_QUERY_SCHEMA.parse(_req.query);

  // Verificar que la sede existe
  const VENUE = await PRISMA.venue.findUnique({ where: { id: PARAMS.venueId }, select: { id: true } });
  if (VENUE === null) {
    throw new AppError('SEDE_NO_ENCONTRADA', 'La sede indicada no existe.', 404);
  }

  const useCase = new ListCourtsUseCase(courtRepositoryFactory());
  const result = await useCase.executeSV({ venueId: PARAMS.venueId, status: QUERY.status } as ListCourtsInputDTO);

  _res.status(200).json({
    success: true,
    message: 'Canchas obtenidas correctamente.',
    data: { items: result.courts },
  });
}

export async function getVenuePaymentInfoCON(_req: Request, _res: Response): Promise<void> {
  const ACTOR_USER_ID = _req.authUser?.id;
  if (ACTOR_USER_ID === undefined) {
    throw new AppError('NO_AUTORIZADO', 'Sesion no disponible.', 401);
  }

  const PARAMS = VENUE_ID_PARAM_SCHEMA.parse(_req.params);

  const VENUE = await PRISMA.venue.findUnique({
    where: { id: PARAMS.venueId },
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

  if (VENUE === null) {
    throw new AppError('NO_ENCONTRADO', 'Sede no encontrada.', 404);
  }

  _res.status(200).json({
    success: true,
    message: 'Informacion de pago obtenida correctamente.',
    data: VENUE,
  });
}

// ---------------------------------------------------------------------------
// PUT /venues/:venueId/courts/:courtId
// ---------------------------------------------------------------------------

export async function putCourtCON(_req: Request, _res: Response): Promise<void> {
  const PARAMS = { ...VENUE_ID_PARAM_SCHEMA.parse(_req.params), ...COURT_ID_PARAM_SCHEMA.parse(_req.params) };
  const BODY = UPDATE_COURT_BODY_SCHEMA.parse(_req.body);

  // Verificar que la sede existe
  const VENUE = await PRISMA.venue.findUnique({ where: { id: PARAMS.venueId }, select: { id: true } });
  if (VENUE === null) {
    throw new AppError('SEDE_NO_ENCONTRADA', 'La sede indicada no existe.', 404);
  }

  const useCase = new UpdateCourtUseCase(courtRepositoryFactory());
  const result = await useCase.executeSV({ courtId: PARAMS.courtId, ...BODY } as UpdateCourtInputDTO);

  _res.status(200).json({
    success: true,
    message: 'Cancha actualizada correctamente.',
    data: result.court,
  });
}

// ---------------------------------------------------------------------------
// DELETE /venues/:venueId/courts/:courtId
// ---------------------------------------------------------------------------

export async function deleteCourtCON(_req: Request, _res: Response): Promise<void> {
  const PARAMS = { ...VENUE_ID_PARAM_SCHEMA.parse(_req.params), ...COURT_ID_PARAM_SCHEMA.parse(_req.params) };

  // Verificar que la sede existe
  const VENUE = await PRISMA.venue.findUnique({ where: { id: PARAMS.venueId }, select: { id: true } });
  if (VENUE === null) {
    throw new AppError('SEDE_NO_ENCONTRADA', 'La sede indicada no existe.', 404);
  }

  const useCase = new CancelCourtUseCase(courtRepositoryFactory());
  const result = await useCase.executeSV({ courtId: PARAMS.courtId } as CancelCourtInputDTO);

  _res.status(200).json({
    success: true,
    message: 'Cancha cancelada correctamente.',
    data: result.court,
  });
}

// ---------------------------------------------------------------------------
// GET /venues/:venueId
// ---------------------------------------------------------------------------

export async function getVenueCON(_req: Request, _res: Response): Promise<void> {
  const ACTOR_USER_ID = _req.authUser?.id;
  if (ACTOR_USER_ID === undefined) {
    throw new AppError('NO_AUTORIZADO', 'Sesion no disponible.', 401);
  }

  const PARAMS = VENUE_ID_PARAM_SCHEMA.parse(_req.params);

  const VENUE = await PRISMA.venue.findUnique({
    where: { id: PARAMS.venueId },
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
      _count: { select: { courts: true } },
    },
  });

  if (VENUE === null) {
    throw new AppError('NO_ENCONTRADO', 'Sede no encontrada.', 404);
  }

  const OPENING_HOURS = VENUE.openingHours as Record<string, { open: string; close: string }> | null;

  _res.status(200).json({
    success: true,
    message: 'Sede obtenida correctamente.',
    data: {
      id: VENUE.id,
      name: VENUE.name,
      address: VENUE.address,
      phone: VENUE.phone,
      email: VENUE.email,
      description: VENUE.description,
      openingTime: OPENING_HOURS?.monday?.open ?? '08:00',
      closingTime: OPENING_HOURS?.monday?.close ?? '23:00',
      activeDays: OPENING_HOURS ? Object.keys(OPENING_HOURS).map((d) => d.slice(0, 3).toLowerCase()) : ['mon', 'tue', 'wed', 'thu', 'fri', 'sat'],
      courtsCount: VENUE._count.courts,
      latitude: VENUE.latitude,
      longitude: VENUE.longitude,
      paymentHolder: VENUE.paymentHolder,
      paymentBank: VENUE.paymentBank,
      paymentCvu: VENUE.paymentCvu,
      paymentAlias: VENUE.paymentAlias,
      paymentNotes: VENUE.paymentNotes,
    },
  });
}

