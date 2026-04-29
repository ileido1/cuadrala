import type { Request, Response } from 'express';

import { PRISMA } from '../../infrastructure/prisma_client.js';
import {
  CREATE_COURT_BODY_SCHEMA,
  CREATE_VENUE_BODY_SCHEMA,
  LIST_VENUES_QUERY_SCHEMA,
  VENUE_ID_PARAM_SCHEMA,
} from '../validation/venues.validation.js';

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
  const CREATED = await PRISMA.venue.create({
    data: {
      name: BODY.name,
      address: BODY.address ?? null,
      latitude: BODY.latitude ?? null,
      longitude: BODY.longitude ?? null,
    },
    select: { id: true, name: true, address: true, latitude: true, longitude: true, createdAt: true },
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

  const CREATED = await PRISMA.court.create({
    data: { venueId: PARAMS.venueId, name: BODY.name },
    select: { id: true, venueId: true, name: true, createdAt: true },
  });

  _res.status(201).json({
    success: true,
    message: 'Cancha creada correctamente.',
    data: CREATED,
  });
}

